import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      consent_id, name, nationality, email,
      is_adult, consent_content, consent_privacy,
      signature_data, filming_date, filming_location, language,
    } = body;

    if (!name || !nationality || !is_adult || !consent_content || !consent_privacy || !signature_data || !consent_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // 1. Supabase 저장
    const { data, error } = await supabaseAdmin
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
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    // 2. 이메일 발송
    let emailSent = false;
    if (email) {
      try {
        const subjects: Record<string, string> = {
          kr: 'K-DocFinder 인터뷰 동의서 사본',
          en: 'K-DocFinder Interview Consent Copy',
          ja: 'K-DocFinder インタビュー同意書のコピー',
          'zh-cn': 'K-DocFinder 采访同意书副本',
          'zh-tw': 'K-DocFinder 訪問同意書副本',
        };

        await resend.emails.send({
          from: process.env.CONSENT_FROM_EMAIL || 'K-DocFinder <onboarding@resend.dev>',
          to: email,
          subject: subjects[language] || subjects.en,
          html: generateEmail({ consent_id, name, nationality, language, created_at: data.created_at, expires_at: data.expires_at }),
        });

        emailSent = true;
        await supabaseAdmin
          .from('consent_records')
          .update({ email_sent: true, email_sent_at: new Date().toISOString() })
          .eq('id', data.id);
      } catch (e) {
        console.error('Email error:', e);
      }
    }

    return NextResponse.json({ success: true, consent_id, email_sent: emailSent });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateEmail(p: { consent_id: string; name: string; nationality: string; language: string; created_at: string; expires_at: string }) {
  const date = new Date(p.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const expDate = new Date(p.expires_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  const t: Record<string, { title: string; greeting: string; body: string; items: string[]; withdraw: string; footer: string }> = {
    kr: {
      title: 'K-DocFinder 인터뷰 동의서 사본',
      greeting: `${p.name}님, 인터뷰에 참여해 주셔서 감사합니다.`,
      body: '아래는 동의하신 내용의 요약입니다.',
      items: [`동의서 ID: ${p.consent_id}`, `이름: ${p.name}`, `국적: ${p.nationality}`, `동의일: ${date}`, `만료일: ${expDate} (5년)`],
      withdraw: '동의 철회를 원하시면 아래 이메일로 연락해 주세요.',
      footer: '본 콘텐츠는 K-DocFinder 플랫폼 홍보 목적으로만 사용되며, 특정 병원의 직접 홍보에는 사용되지 않습니다.',
    },
    en: {
      title: 'K-DocFinder Interview Consent Copy',
      greeting: `Dear ${p.name}, thank you for participating in the interview.`,
      body: 'Below is a summary of your consent.',
      items: [`Consent ID: ${p.consent_id}`, `Name: ${p.name}`, `Nationality: ${p.nationality}`, `Date: ${date}`, `Expiry: ${expDate} (5 years)`],
      withdraw: 'To withdraw your consent, please contact us at:',
      footer: 'This content is used solely for K-DocFinder platform promotion and will NOT be used for direct promotion of specific hospitals.',
    },
    ja: {
      title: 'K-DocFinder インタビュー同意書コピー',
      greeting: `${p.name}様、インタビューにご参加いただきありがとうございます。`,
      body: '以下は同意内容の要約です。',
      items: [`同意書ID: ${p.consent_id}`, `氏名: ${p.name}`, `国籍: ${p.nationality}`, `同意日: ${date}`, `有効期限: ${expDate}（5年間）`],
      withdraw: '同意の撤回をご希望の場合:',
      footer: '本コンテンツはK-DocFinderプラットフォームのプロモーション目的のみに使用されます。',
    },
    'zh-cn': {
      title: 'K-DocFinder 采访同意书副本',
      greeting: `${p.name}，感谢您参与采访。`,
      body: '以下是您同意内容的摘要。',
      items: [`同意书ID: ${p.consent_id}`, `姓名: ${p.name}`, `国籍: ${p.nationality}`, `同意日期: ${date}`, `到期日期: ${expDate}（5年）`],
      withdraw: '如需撤回同意，请联系:',
      footer: '此内容仅用于K-DocFinder平台推广，不会用于特定医院的直接宣传。',
    },
    'zh-tw': {
      title: 'K-DocFinder 訪問同意書副本',
      greeting: `${p.name}，感謝您參與訪問。`,
      body: '以下是您同意內容的摘要。',
      items: [`同意書ID: ${p.consent_id}`, `姓名: ${p.name}`, `國籍: ${p.nationality}`, `同意日期: ${date}`, `到期日期: ${expDate}（5年）`],
      withdraw: '如需撤回同意，請聯繫:',
      footer: '此內容僅用於K-DocFinder平台推廣，不會用於特定醫院的直接宣傳。',
    },
  };

  const c = t[p.language] || t.en;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:system-ui,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 16px;">
<div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
<div style="background:linear-gradient(135deg,#003CB3,#0057FF,#3388FF);padding:28px 24px;text-align:center;">
<div style="font-size:22px;font-weight:800;color:#fff;">K-DocFinder</div>
<div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:4px;">${c.title}</div>
</div>
<div style="padding:28px 24px;">
<p style="font-size:15px;color:#1a1f36;margin:0 0 6px;font-weight:600;">${c.greeting}</p>
<p style="font-size:13px;color:#666;margin:0 0 20px;">${c.body}</p>
<div style="background:#f7f8fa;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
${c.items.map(i => `<div style="font-size:13px;color:#444;padding:5px 0;border-bottom:1px solid #eee;">${i}</div>`).join('')}
</div>
<div style="background:#f0f5ff;border-left:3px solid #0057FF;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:20px;">
<p style="font-size:12px;color:#0052CC;margin:0;line-height:1.6;">${c.footer}</p>
</div>
<p style="font-size:12px;color:#888;margin:0 0 8px;">${c.withdraw}</p>
<a href="mailto:kdocfinder@gmail.com" style="display:inline-block;padding:8px 20px;background:#f0f0f0;border-radius:8px;font-size:13px;color:#0057FF;text-decoration:none;font-weight:600;">kdocfinder@gmail.com</a>
</div>
<div style="border-top:1px solid #f0f0f0;padding:16px 24px;text-align:center;">
<p style="font-size:11px;color:#bbb;margin:0;">© 2026 K-DocFinder (주식회사 닥터랩)</p>
</div>
</div></div></body></html>`;
}
