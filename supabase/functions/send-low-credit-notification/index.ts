import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const THRESHOLDS = {
  critical: 10,
  low: 25,
  warning: 50,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { credits } = await req.json();
    const userEmail = user.email;

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine threshold level
    let thresholdLevel = null;
    if (credits <= THRESHOLDS.critical) {
      thresholdLevel = "critical";
    } else if (credits <= THRESHOLDS.low) {
      thresholdLevel = "low";
    } else if (credits <= THRESHOLDS.warning) {
      thresholdLevel = "warning";
    }

    if (!thresholdLevel) {
      return new Response(
        JSON.stringify({ message: "Credits above all thresholds, no notification needed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if notification was already sent for this threshold
    const { data: existingNotification } = await supabaseClient
      .from("credit_notifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("threshold_level", thresholdLevel)
      .maybeSingle();

    if (existingNotification) {
      return new Response(
        JSON.stringify({ message: "Notification already sent for this threshold" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Email content based on threshold
    const emailContent = {
      critical: {
        subject: "⚠️ Critical: Your MindfulAI Credits Are Almost Depleted",
        body: `Your MindfulAI credit balance is critically low at ${credits} credits. You have approximately ${Math.floor(credits / 10)} minutes of call time or ${Math.floor(credits / 5)} chat messages remaining. Top up now to continue your wellness journey without interruption.`,
      },
      low: {
        subject: "🔔 Low Credit Alert - MindfulAI",
        body: `Your MindfulAI credit balance is running low at ${credits} credits. Consider purchasing more credits to ensure uninterrupted access to your AI wellness companion.`,
      },
      warning: {
        subject: "💡 Credit Reminder - MindfulAI",
        body: `Just a friendly reminder that your MindfulAI credit balance is at ${credits} credits. You might want to top up soon to keep your wellness sessions going smoothly.`,
      },
    };

    const { subject, body } = emailContent[thresholdLevel];

    // Send email using Resend API
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (RESEND_API_KEY) {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "MindfulAI <notifications@mindfulai.com>",
          to: [userEmail],
          subject: subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: ${thresholdLevel === 'critical' ? '#EF4444' : thresholdLevel === 'low' ? '#F59E0B' : '#14B8A6'};">
                ${thresholdLevel === 'critical' ? '⚠️ Critical Alert' : thresholdLevel === 'low' ? '🔔 Low Credit Alert' : '💡 Credit Reminder'}
              </h2>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">${body}</p>
              <div style="margin-top: 30px;">
                <a href="https://mindfulai.com/pricing" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                  Buy More Credits
                </a>
              </div>
              <p style="color: #9CA3AF; font-size: 14px; margin-top: 30px;">
                Current Balance: ${credits} credits<br>
                Estimated Call Time: ${Math.floor(credits / 10)} minutes<br>
                Estimated Chat Messages: ${Math.floor(credits / 5)} messages
              </p>
            </div>
          `,
        }),
      });

      if (!emailResponse.ok) {
        console.error("Failed to send email:", await emailResponse.text());
      }
    }

    // Record the notification
    await supabaseClient
      .from("credit_notifications")
      .insert({
        user_id: user.id,
        email: userEmail,
        threshold_level: thresholdLevel,
        credits_at_notification: credits,
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${thresholdLevel} notification sent`,
        threshold: thresholdLevel,
        credits: credits 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});