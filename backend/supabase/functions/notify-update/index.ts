// notify-update/index.ts
// Supabase Edge Function to securely dispatch push notifications using OneSignal

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ONESIGNAL_API_URL = "https://onesignal.com/api/v1/notifications"

serve(async (req) => {
  // Handle CORS preflight options request
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const { title, message } = await req.json()

    if (!title || !message) {
      return new Response(JSON.stringify({ error: "Missing title or message" }), {
        status: 400,
        headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' }
      })
    }

    // Retrieve OneSignal credentials securely from Supabase Environment Variables
    const appId = Deno.env.get("ONESIGNAL_APP_ID")
    const apiKey = Deno.env.get("ONESIGNAL_API_KEY")

    if (!appId || !apiKey) {
      return new Response(JSON.stringify({ error: "OneSignal credentials (ONESIGNAL_APP_ID, ONESIGNAL_API_KEY) are not set in Supabase Edge environment variables" }), {
        status: 500,
        headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' }
      })
    }

    console.log(`Edge Function triggering push alert: "${title}"`);

    // Call OneSignal REST API
    const response = await fetch(ONESIGNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${apiKey}`
      },
      body: JSON.stringify({
        app_id: appId,
        included_segments: ["All"],
        headings: { en: title },
        contents: { en: message }
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.errors?.[0] || "OneSignal API request failed")
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' }
    })

  } catch (err: any) {
    console.error("Edge Function Error:", err.message)
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' }
    })
  }
})
