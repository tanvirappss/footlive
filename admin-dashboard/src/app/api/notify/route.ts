import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { title, message, appId, apiKey } = await request.json();

    if (!title || !message || !appId || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required parameters: title, message, appId, apiKey' },
        { status: 400 }
      );
    }

    console.log(`Sending OneSignal notification: "${title}" via App ID: ${appId}`);

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        included_segments: ['All'],
        headings: { en: title },
        contents: { en: message },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.errors?.[0] || 'Failed to dispatch notification via OneSignal');
    }

    return NextResponse.json({ success: true, result: data });
  } catch (err: any) {
    console.error('OneSignal Push Notification Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
