
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

    const { callId, callSid, durationSeconds } = await req.json();

    // Calculate credits used (10 credits per minute, rounded up)
    const creditsUsed = Math.ceil(durationSeconds / 60) * 10;

    // Update call history
    await supabaseClient
      .from('call_history')
      .update({
        duration_seconds: durationSeconds,
        credits_used: creditsUsed,
        status: 'completed',
        ended_at: new Date().toISOString(),
      })
      .eq('id', callId);

    // Deduct credits from user
    const { data: currentCredits } = await supabaseClient
      .from('user_credits')
      .select('credits')
      .eq('user_id', user.id)
      .single();

    if (currentCredits) {
      const newCredits = Math.max(0, currentCredits.credits - creditsUsed);
      
      await supabaseClient
        .from('user_credits')
        .update({ 
          credits: newCredits,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      // Record transaction
      await supabaseClient
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          amount: -creditsUsed,
          type: 'usage',
          description: `Call duration: ${Math.ceil(durationSeconds / 60)} minutes`,
          call_id: callId,
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          creditsUsed,
          remainingCredits: newCredits,
          message: 'Call ended and credits deducted' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Failed to update credits');

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
