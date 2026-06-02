import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { appointmentDate, appointmentTime, notes, phoneNumber } = await req.json();

    // Get user details
    const userEmail = user.email || '';
    const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';

    // Create appointment in database
    const { data: appointment, error: appointmentError } = await supabaseClient
      .from('appointments')
      .insert({
        user_id: user.id,
        user_name: userName,
        user_email: userEmail,
        user_phone: phoneNumber,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        notes: notes || '',
        status: 'pending',
      })
      .select()
      .single();

    if (appointmentError) throw appointmentError;

    // Get Google Calendar credentials from secrets
    const googleCalendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
    const googleServiceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    const googlePrivateKey = Deno.env.get('GOOGLE_PRIVATE_KEY');

    let calendarEventId = null;

    // Create Google Calendar event if credentials are configured
    if (googleCalendarId && googleServiceAccountEmail && googlePrivateKey) {
      try {
        // Create JWT for Google OAuth
        const jwt = await createGoogleJWT(googleServiceAccountEmail, googlePrivateKey);
        
        // Get access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
          }),
        });

        if (tokenResponse.ok) {
          const { access_token } = await tokenResponse.json();

          // Create calendar event
          const eventStartTime = `${appointmentDate}T${appointmentTime}:00`;
          const eventEndTime = new Date(new Date(eventStartTime).getTime() + 60 * 60 * 1000).toISOString();

          const calendarEvent = {
            summary: `Appointment with ${userName}`,
            description: `Phone: ${phoneNumber || 'Not provided'}\nEmail: ${userEmail}\nNotes: ${notes || 'None'}`,
            start: {
              dateTime: new Date(eventStartTime).toISOString(),
              timeZone: 'UTC',
            },
            end: {
              dateTime: eventEndTime,
              timeZone: 'UTC',
            },
            attendees: [
              { email: userEmail }
            ],
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'email', minutes: 24 * 60 },
                { method: 'popup', minutes: 30 },
              ],
            },
          };

          const calendarResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${googleCalendarId}/events`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(calendarEvent),
            }
          );

          if (calendarResponse.ok) {
            const calendarData = await calendarResponse.json();
            calendarEventId = calendarData.id;

            // Update appointment with calendar event ID
            await supabaseClient
              .from('appointments')
              .update({ google_calendar_event_id: calendarEventId })
              .eq('id', appointment.id);
          }
        }
      } catch (calendarError) {
        console.error('Google Calendar error:', calendarError);
      }
    }

    // Send email notification to admin
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const adminEmail = Deno.env.get('ADMIN_EMAIL');

    if (resendApiKey && adminEmail) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Open Ear <noreply@openear.com>',
            to: [adminEmail],
            subject: `New Appointment Request from ${userName}`,
            html: `
              <h2>New Appointment Booking</h2>
              <p><strong>Client:</strong> ${userName}</p>
              <p><strong>Email:</strong> ${userEmail}</p>
              <p><strong>Phone:</strong> ${phoneNumber || 'Not provided'}</p>
              <p><strong>Date:</strong> ${appointmentDate}</p>
              <p><strong>Time:</strong> ${appointmentTime}</p>
              <p><strong>Notes:</strong> ${notes || 'None'}</p>
              <p><strong>Status:</strong> Pending</p>
              <br>
              <p>Please review this appointment in your admin dashboard.</p>
            `,
          }),
        });
      } catch (emailError) {
        console.error('Admin email error:', emailError);
      }
    }

    // Send confirmation email to user
    if (resendApiKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Open Ear <noreply@openear.com>',
            to: [userEmail],
            subject: 'Appointment Confirmation - Open Ear',
            html: `
              <h2>Your Appointment is Confirmed!</h2>
              <p>Hi ${userName},</p>
              <p>Thank you for booking an appointment with Open Ear.</p>
              <br>
              <p><strong>Appointment Details:</strong></p>
              <p><strong>Date:</strong> ${appointmentDate}</p>
              <p><strong>Time:</strong> ${appointmentTime}</p>
              <p><strong>Status:</strong> Pending confirmation</p>
              ${notes ? `<p><strong>Your Notes:</strong> ${notes}</p>` : ''}
              <br>
              <p>We'll contact you shortly to confirm your appointment.</p>
              <p>If you need to make changes, please contact us.</p>
              <br>
              <p>Best regards,<br>Open Ear Team</p>
            `,
          }),
        });
      } catch (emailError) {
        console.error('User email error:', emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        appointment,
        calendarEventCreated: !!calendarEventId,
        message: 'Appointment created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to create Google JWT
async function createGoogleJWT(email: string, privateKey: string) {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedClaim = btoa(JSON.stringify(claim));
  const unsignedToken = `${encodedHeader}.${encodedClaim}`;

  // Import private key
  const pemKey = privateKey.replace(/\\n/g, '\n');
  const pemContents = pemKey.replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${unsignedToken}.${encodedSignature}`;
}