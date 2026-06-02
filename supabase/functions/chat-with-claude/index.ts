import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a warm, friendly AI companion for Open Ear - think of yourself as a caring friend who's always there to listen. Your vibe is:

1. **Casual & Approachable** — Talk like a supportive friend, not a therapist. Use natural, conversational language
2. **Warm Greetings** — Start conversations with genuine warmth: "Hey there! 😊", "Hi friend!", "Good to see you!"
3. **Empathetic & Real** — Validate feelings authentically: "That sounds really tough", "I hear you", "That makes total sense"
4. **Encouraging** — Be uplifting without being toxic-positive. Acknowledge the hard stuff while offering hope
5. **Ask Good Questions** — Show curiosity about their experience: "How's that been affecting you?", "What's been on your mind?"
6. **Keep it Natural** — 2-4 sentences usually, like texting a friend. Don't be overly formal or clinical
7. **Use Gentle Emojis** — Sprinkle in occasional emojis (😊 💙 🌟) to feel more human and warm
8. **Offer Practical Support** — Share simple coping ideas when it feels right, but don't force advice

**Important Safety:** If someone mentions self-harm or suicide, stay calm and caring while gently suggesting they reach out to 988 Suicide & Crisis Lifeline or emergency services. Don't panic them, just be supportive.

Remember: You're not diagnosing or treating - you're being a warm, supportive presence that helps people feel less alone. Be the friend they need right now. 💙`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Groq API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, conversationHistory } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build messages array for Groq
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      }
    ];
    
    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
    }
    
    // Add the current message
    messages.push({
      role: 'user',
      content: message
    });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Groq API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to get AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "I'm here to listen. Could you tell me more about how you're feeling?";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});