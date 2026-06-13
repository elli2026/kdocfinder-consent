import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY;

    console.log('ENV CHECK - URL starts:', url?.substring(0, 10));
    console.log('ENV CHECK - KEY starts:', key?.substring(0, 10));
    console.log('ENV CHECK - RESEND starts:', resendKey?.substring(0, 10));

    if (!url || !key) {
      return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 });
    }

    const supabase = createClient(url, key);
    const body = await req.json();

    const {
      consent_id, name, nationality, email,
      is_adult, consent_content, consent_privacy,
      signature_data, filming_date, filming_location, language,
    } = body;

    if (!name || !nationality || !consent_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const { data, error } = await supabase
      .from('consent_records')
      .insert({
        consent_id, name, nationality,
        email: email || null,
        is_adult, consent_content, consent_privacy,
        signature_data,
        filming_date: filming_date || new Date().toISOString().split('T')[0],
        filming_location: filming_location || null,
        language: language || 'kr',
        ip_address: ip,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', JSON.stringify(error));
      return NextResponse.json({ error: 'Failed to save', detail: error.message }, { status: 500 });
    }

    console.log('SUCCESS - saved consent:', consent_id);

    let emailSent = false;
    if (email && resendKey) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: process.env.CONSENT_FROM_EMAIL || 'onboarding@resend.dev',
          to: email,
          subject: 'K-DocFinder Interview Consent Copy',
          html: '<h2>K-DocFinder</h2><p>Consent ID: ' + consent_id + '</p><p>Name: ' + name + '</p><p>Thank you for participating.</p><p>To withdraw: kdocfinder@gmail.com</p>',
        });
        emailSent = true;
        console.log('Email sent to:', email);
        await supabase.from('consent_records').update({ email_sent: true, email_sent_at: new Date().toISOString() }).eq('consent_id', consent_id);
      } catch (e: any) {
        console.error('Email error:', e?.message);
      }
    }

    return NextResponse.json({ success: true, consent_id, email_sent: emailSent });
  } catch (err: any) {
    console.error('API error:', err?.message, err?.stack);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}