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

    // Check if user is admin
    const { data: adminData } = await supabaseClient
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!adminData) {
      throw new Error('Admin access required');
    }

    const { appointmentId, status } = await req.json();

    // Update appointment status
    const { data: appointment, error } = await supabaseClient
      .from('appointments')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) throw error;

    // Send email notification to user about status change
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (resendApiKey && appointment) {
      try {
        let emailSubject = '';
        let emailMessage = '';

        if (status === 'confirmed') {
          emailSubject = 'Appointment Confirmed - Open Ear';
          emailMessage = `
            <h2>Your Appointment is Confirmed!</h2>
            <p>Hi ${appointment.user_name},</p>
            <p>Great news! Your appointment has been confirmed.</p>
            <br>
            <p><strong>Appointment Details:</strong></p>
            <p><strong>Date:</strong> ${appointment.appointment_date}</p>
            <p><strong>Time:</strong> ${appointment.appointment_time}</p>
            <br>
            <p>We look forward to speaking with you!</p>
            <p>Best regards,<br>Open Ear Team</p>
          `;
        } else if (status === 'cancelled') {
          emailSubject = 'Appointment Cancelled - Open Ear';
          emailMessage = `
            <h2>Appointment Cancelled</h2>
            <p>Hi ${appointment.user_name},</p>
            <p>Your appointment scheduled for ${appointment.appointment_date} at ${appointment.appointment_time} has been cancelled.</p>
            <br>
            <p>If you'd like to reschedule, please book a new appointment.</p>
            <p>Best regards,<br>Open Ear Team</p>
          `;
        } else if (status === 'completed') {
          emailSubject = 'Thank You - Open Ear';
          emailMessage = `
            <h2>Thank You for Your Time</h2>
            <p>Hi ${appointment.user_name},</p>
            <p>Thank you for your appointment with Open Ear. We hope it was helpful.</p>
            <br>
            <p>If you need further support, feel free to book another session.</p>
            <p>Best regards,<br>Open Ear Team</p>
          `;
        }

        if (emailSubject && emailMessage) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Open Ear <noreply@openear.com>',
              to: [appointment.user_email],
              subject: emailSubject,
              html: emailMessage,
            }),
          });
        }
      } catch (emailError) {
        console.error('Email notification error:', emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        appointment,
        message: 'Appointment status updated successfully'
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