
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

    const { toNumber } = await req.json();

    // Check user credits
    const { data: creditData, error: creditError } = await supabaseClient
      .from('user_credits')
      .select('credits')
      .eq('user_id', user.id)
      .single();

    if (creditError || !creditData || creditData.credits < 10) {
      return new Response(
        JSON.stringify({ error: 'Insufficient credits. Minimum 10 credits required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Twilio credentials from secrets
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !twilioNumber) {
      throw new Error('Twilio credentials not configured');
    }

    // Create TwiML for the call
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello, you are now connected to Open Ear support. Our AI assistant is here to listen and help you. Please share what's on your mind.</Say>
  <Pause length="1"/>
  <Say voice="alice">This is a simulated call. In production, this would connect to your AI voice assistant.</Say>
</Response>`;

    // Initiate Twilio call
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
    const auth = btoa(`${accountSid}:${authToken}`);

    const formData = new URLSearchParams();
    formData.append('To', toNumber);
    formData.append('From', twilioNumber);
    formData.append('Twiml', twiml);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!twilioResponse.ok) {
      const error = await twilioResponse.text();
      throw new Error(`Twilio API error: ${error}`);
    }

    const callData = await twilioResponse.json();

    // Create call history record
    const { data: callRecord, error: callError } = await supabaseClient
      .from('call_history')
      .insert({
        user_id: user.id,
        call_sid: callData.sid,
        status: 'in-progress',
      })
      .select()
      .single();

    if (callError) {
      throw callError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        callSid: callData.sid,
        callId: callRecord.id,
        message: 'Call initiated successfully' 
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
