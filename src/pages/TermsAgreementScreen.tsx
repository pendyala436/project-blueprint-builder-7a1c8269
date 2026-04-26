import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useRegistrationGuard } from "@/hooks/useRegistrationGuard";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import MeowLogo from "@/components/MeowLogo";
import ProgressIndicator from "@/components/ProgressIndicator";
import { useToast } from "@/hooks/use-toast";
import { 
  ScrollText, 
  Shield, 
  Check, 
  Loader2, 
  FileText,
  Lock,
  Globe,
  Database,
  Users,
  Ban,
  CreditCard,
  Eye,
  UserCheck,
  Bot,
  Clock,
  CheckCircle2,
  ArrowLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { countries } from "@/data/countries";
import { getStatesForCountry } from "@/data/states";
import { languages } from "@/data/languages";

const AuroraBackground = lazy(() => import("@/components/AuroraBackground"));

interface LegalDocument {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: string;
  required: boolean;
}

const EFFECTIVE_DATE = "26 April 2026";

const legalDocuments: LegalDocument[] = [
  {
    id: "terms_of_service",
    title: "Terms of Service",
    icon: <ScrollText className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW — TERMS OF SERVICE
Effective: ${EFFECTIVE_DATE}

1. ACCEPTANCE
By creating an account or using Meow Meow ("the App", "we", "us"), you enter a binding agreement with the operator of Meow Meow. If you do not agree, you must not use the App.

2. ELIGIBILITY (STRICT 18+)
• You must be at least 18 years old (or the legal age of majority in your jurisdiction, whichever is higher).
• The App is intended exclusively for residents of India and verified Indian users.
• Only two gender options are supported: Male and Female. Gender is verified using AI face/photo analysis.
• One natural person = one account. Duplicate, fake, bot, or shared accounts are prohibited.
• You must provide truthful, accurate, and current information at registration and keep it updated.
• Use of VPN, Tor, GPS spoofing, or any tool to misrepresent your location, identity, gender, or age is forbidden and will result in permanent ban and forfeiture of any wallet balance or earnings.

3. NATURE OF SERVICE
Meow Meow is an opposite-sex social and communication platform offering:
• Real-time text chat with auto-translation across 100+ languages.
• 1:1 audio and video calls (WhatsApp-style) initiated by men and accepted by women.
• Private flower-themed group video calls (up to 50 rooms).
• Language-specific community group chat for women.
Chat is text-only — no media attachments. The service is provided online and depends on network connectivity, third-party infrastructure, and user availability.

4. ACCOUNT REGISTRATION & VERIFICATION
• Email, phone, gender, age, country (India), state, languages and a live selfie are required.
• AI face verification confirms a real, single, live human and estimates gender; mismatched photos are rejected.
• Female users must complete a 9-section Bank KYC (PAN, Aadhaar, bank account, IFSC, UPI, address proof) to receive payouts. KYC data is encrypted and used only for payout, taxation, and anti-fraud purposes.
• We may re-verify identity at any time and suspend access pending verification.

5. PROHIBITED CONDUCT
You shall NOT, directly or indirectly:
(a) Post, send, or solicit any sexual, obscene, pornographic, nude, semi-nude, erotic, or sexually-suggestive content (zero-tolerance — see Anti-Sexual Content Policy).
(b) Engage with, attempt to engage with, or depict minors in any sexual or grooming context. Such conduct will be reported to the National Cyber Crime Reporting Portal (cybercrime.gov.in), NCMEC, INTERPOL, and local police, and the offender's full data will be preserved for law enforcement.
(c) Harass, stalk, threaten, defame, dox, blackmail, sextort, hate-speech, intimidate, or discriminate against any user on grounds of religion, caste, race, gender, sexual orientation, disability, or nationality.
(d) Solicit, exchange, or share personal contact details (phone, WhatsApp, Telegram, Instagram, Snapchat, email, address, social handles, payment apps such as UPI/Paytm/PhonePe/GPay) inside chat, calls, or profile.
(e) Solicit prostitution, escort services, sugar-daddy/sugar-baby arrangements, or any commercial sexual activity.
(f) Run, promote, or fall for any romance scam, advance-fee fraud, investment scam, crypto scam, "lottery" scam, fake-emergency scam, "pig butchering", catfishing, or impersonation.
(g) Upload, transmit, or distribute viruses, malware, spyware, scraping bots, automation scripts, or attempt reverse engineering, penetration testing, or denial-of-service.
(h) Circumvent gender, age, geography, payment, or moderation controls.
(i) Use the App for money laundering, terror financing, hawala, or any activity prohibited under the Prevention of Money Laundering Act 2002, FEMA 1999, UAPA 1967, or international sanctions (OFAC, UN, EU).
(j) Infringe any copyright, trademark, trade secret, publicity, or privacy right.
(k) Engage in chargeback fraud, "friendly fraud", or recharge with stolen cards/UPI.
(l) Sell, transfer, rent, or share your account.

6. PAYMENTS — MEN (Wallet & Coins)
• Men recharge their in-app wallet using INR via authorized payment processors (Razorpay/Paddle/Stripe etc.).
• Per-second pro-rated billing applies to chat, calls, and groups (see in-app rates).
• 18% GST is charged on each recharge as required under the CGST/SGST/IGST Acts and is included in the displayed price.
• Coins/balance are NON-REFUNDABLE except where mandated by Indian Consumer Protection Act 2019 or RBI guidelines.
• Initiating a chargeback without first contacting support is treated as fraud and results in permanent ban + reporting to the payment network.

7. EARNINGS & PAYOUTS — WOMEN
• Female users earn a share of men's spend on chats/calls/groups they participate in.
• Earnings appear in the in-app Statement and Wallet ledger as a single source of truth.
• Bi-monthly snapshots (1st and 16th) are generated; payouts are processed to the verified bank/UPI listed in KYC.
• TDS under section 194-O / 194-R / 194-S of the Income Tax Act 1961 may be deducted; a TDS certificate (Form 16A) is issued where applicable.
• Earnings from fake activity, collusion, automation, sexual content, contact-sharing, or manipulation are forfeited and the account is permanently banned.

8. CONTENT LICENSE
You retain ownership of content you create. By submitting it, you grant Meow Meow a worldwide, royalty-free, non-exclusive, sub-licensable licence to host, store, transmit, translate, moderate, and display it solely to operate, improve, and protect the service.

9. AI-ASSISTED FEATURES
The App uses AI for: face/liveness detection, gender estimation, age estimation, language detection, real-time translation, content moderation, and fraud detection. AI outputs may be wrong; you may request human review of any adverse automated decision.

10. SUSPENSION & TERMINATION
We may suspend, restrict, shadow-ban, or permanently terminate your account at our sole discretion, without prior notice, for any breach of these Terms or applicable law. You may delete your account at any time from Settings; certain data will be retained as described in the Data Retention Policy.

11. DISCLAIMERS
THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE". TO THE MAXIMUM EXTENT PERMITTED BY LAW WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ACCURACY. WE DO NOT GUARANTEE COMPATIBILITY, FRIENDSHIP, RELATIONSHIP, OR ANY SPECIFIC OUTCOME WITH ANY OTHER USER.

12. LIMITATION OF LIABILITY
To the maximum extent permitted by law, our aggregate liability for any claim arising out of or relating to the App is limited to the amount you paid into your wallet in the 3 months preceding the claim, or INR 10,000, whichever is lower. We are not liable for indirect, incidental, special, consequential, exemplary, or punitive damages, lost profits, or loss of data.

13. INDEMNITY
You will defend, indemnify, and hold harmless Meow Meow, its directors, employees, and agents from any claim, loss, liability, or expense (including legal fees) arising from your breach of these Terms, your content, or your conduct.

14. GOVERNING LAW & JURISDICTION
These Terms are governed by the laws of India. Subject to the Arbitration and Conciliation Act 1996, disputes will be referred to a sole arbitrator in Bengaluru, Karnataka. Courts at Bengaluru have exclusive jurisdiction. Foreign users additionally consent to Indian jurisdiction and waive forum non-conveniens objections.

15. CHANGES
We may update these Terms at any time. Material changes will be notified in-app at least 7 days before they take effect. Continued use after the effective date constitutes acceptance.

16. CONTACT / GRIEVANCE OFFICER (per IT Rules 2021)
Grievance Officer: support@meowmeow.app | Response within 24 hours, resolution within 15 days as required by Rule 3(2) of the IT (Intermediary Guidelines) Rules 2021.`
  },
  {
    id: "privacy_policy",
    title: "Privacy Policy",
    icon: <Shield className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW — PRIVACY POLICY
Effective: ${EFFECTIVE_DATE}

This Policy explains what personal data we collect, why, how we use it, and the rights you have under the Digital Personal Data Protection Act, 2023 (India), the EU/UK GDPR, the California Consumer Privacy Act / CPRA, Canada PIPEDA, Brazil LGPD, the Australian Privacy Act 1988, and other applicable laws.

1. DATA WE COLLECT
(a) Identity & profile: full name, gender, date of birth, age, country, state, languages, mother tongue, profile photo / live selfie.
(b) Account: email, phone, hashed password, device ID, IP address (truncated where possible), user-agent.
(c) KYC (women only, payout users): PAN, Aadhaar (masked, last 4), bank account, IFSC, UPI ID, address proof.
(d) Communications metadata: who chatted/called whom, duration, billing seconds. Chat message bodies are end-to-end encrypted in transit and auto-deleted (see §7).
(e) Payment data: amounts, GST, payment method type, transaction status. Full card / UPI credentials are handled directly by PCI-DSS compliant processors and never stored on our servers.
(f) Technical & safety: crash logs, abuse reports, moderation actions, AI verification scores.

2. SENSITIVE PERSONAL DATA
We treat the following as sensitive and apply additional safeguards:
• Biometric data (face embeddings used only for liveness/gender check — discarded after verification).
• Government IDs (encrypted at rest, access-logged, used only for payout & legal compliance).
We do NOT collect: contacts list, social-media accounts, browsing history outside the App, health data, religious or political opinions.

3. LEGAL BASIS (DPDP / GDPR Art. 6)
• Consent — for marketing, optional features, AI gender verification.
• Performance of contract — to operate the App, process payments, deliver chats/calls.
• Legal obligation — tax (Income Tax Act 1961, GST), KYC (PMLA 2002), grievance redressal (IT Rules 2021), child-safety reporting (POCSO 2012).
• Legitimate interest — fraud prevention, security, service improvement, balanced against your rights.

4. PURPOSES OF USE
Account creation; matching opposite-sex users; chat/call/group delivery; AI translation; AI face/gender/age verification; per-second billing & GST invoicing; women's payouts & TDS; safety, moderation, anti-spam; complying with court orders, tax filings, and government requests; communicating service notices.

5. AI AUTOMATED PROCESSING
Decisions made wholly or partly by AI (gender mismatch, content takedown, fraud flag) can be appealed to a human reviewer at support@meowmeow.app within 30 days. We do not perform political profiling or sell biometric data.

6. SHARING & DISCLOSURE
We share data only with:
(a) Sub-processors under written contracts: Supabase (database & auth), Lovable AI Gateway, Razorpay/Stripe/Paddle (payments), TURN/STUN providers (calls), email/SMS gateways.
(b) Government, regulator, court, or law-enforcement when legally compelled (CrPC §91, IT Act §69, DPDP §17, foreign MLATs).
(c) Successor entity in a merger, acquisition, or asset sale (with continued protection).
We do NOT sell or rent personal data to advertisers or data brokers.

7. RETENTION
• Chat message bodies — deleted automatically every 15 minutes.
• Account & profile — until you delete the account, then 30 days grace.
• Payment & GST records — 8 years (Companies Act 2013, GST Act).
• KYC & TDS — 8 years from last transaction (PMLA, Income Tax Act).
• Server & security logs — 30–180 days.
• Court-preserved data — until release.

8. CROSS-BORDER TRANSFERS
Primary storage is in India. Limited data may be processed in Singapore, Japan, the EU, or the United States by sub-processors. Transfers rely on:
• DPDP §16 notified-country mechanism,
• EU Standard Contractual Clauses (SCCs) + Transfer Impact Assessment,
• UK IDTA, Swiss FDPIC clauses where applicable.

9. YOUR RIGHTS
Subject to applicable law you may:
• Access a copy of your data (DPDP §11, GDPR Art.15, CCPA "right to know").
• Correct inaccurate data (DPDP §12, GDPR Art.16).
• Erase your data ("right to be forgotten" — DPDP §12, GDPR Art.17, CCPA "right to delete").
• Restrict or object to processing (GDPR Art.18/21).
• Port your data in a machine-readable format (GDPR Art.20).
• Withdraw consent at any time without affecting prior lawful processing.
• Opt out of "sale/share" — we do not sell, but you can confirm via support.
• Lodge a complaint with the Data Protection Board of India, your EU/UK supervisory authority, the California Privacy Protection Agency, or other regulator.
Exercise rights at: privacy@meowmeow.app — response within 30 days.

10. CHILDREN
The App is strictly 18+. We do not knowingly process data of anyone under 18. If we discover an underage account, we delete it immediately and, where the user appears to be in danger, report to authorities under the POCSO Act 2012 and US COPPA equivalents.

11. SECURITY
TLS 1.3 in transit, AES-256 at rest, role-based access, MFA on admin, RLS-enforced database isolation, daily backups, 24/7 monitoring. No method is 100% secure; we will notify you and the regulator within 72 hours of a notifiable breach (DPDP §8(6), GDPR Art.33-34).

12. COOKIES & SIMILAR
We use only strictly-necessary first-party cookies / local storage for session, auth, and language preference. No third-party advertising trackers.

13. DATA PROTECTION OFFICER (DPO) & GRIEVANCE OFFICER
DPO / Grievance Officer (India): privacy@meowmeow.app — acknowledges within 24 h, resolves within 15 days (IT Rules 2021, Rule 3(2)(a)).

14. UPDATES
Material changes notified in-app 7 days in advance. Last updated: ${EFFECTIVE_DATE}.`
  },
  {
    id: "security_policy",
    title: "Security Policy",
    icon: <Lock className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW — SECURITY POLICY
Effective: ${EFFECTIVE_DATE}

1. ENCRYPTION
• In transit: TLS 1.3 for all client-server traffic; DTLS-SRTP for media (audio/video calls).
• At rest: AES-256 GCM for databases, KYC documents, and backups.
• Passwords: hashed with bcrypt/argon2id + per-user salt.

2. INFRASTRUCTURE
• Cloud-native deployment on hardened, region-isolated servers.
• Web Application Firewall, DDoS mitigation, rate-limiting on auth & payment endpoints.
• coturn TURN/STUN servers with short-lived credentials for calls.
• Network segmentation between application, database, and admin tiers.

3. ACCESS CONTROL
• Principle of least privilege; role-based access (RBAC) enforced in DB via Row-Level Security.
• Multi-factor authentication on all admin accounts.
• Quarterly access reviews; immediate revocation on role change.
• Privileged actions are append-only audit-logged.

4. DEVELOPMENT & SUPPLY CHAIN
• OWASP ASVS-aligned secure SDLC.
• Dependency scanning, SAST, secret-scanning in CI.
• No production data in development or test environments.

5. MONITORING & INCIDENT RESPONSE
• 24/7 automated anomaly detection (failed-login spikes, abuse patterns, fraud signals).
• Incident response plan with RTO 4 h / RPO 1 h.
• Notifiable breach: regulator + affected users informed within 72 h, per DPDP §8(6) and GDPR Art.33-34.

6. BACKUPS & DISASTER RECOVERY
• Encrypted, geo-redundant daily backups, 30-day retention.
• Quarterly DR drills.

7. RESPONSIBLE DISCLOSURE
Researchers may report vulnerabilities to security@meowmeow.app. We commit not to pursue legal action for good-faith research that respects user privacy and avoids service disruption.`
  },
  {
    id: "gdpr_compliance",
    title: "GDPR / UK GDPR Compliance",
    icon: <Globe className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW — EU / UK GDPR COMPLIANCE STATEMENT
Effective: ${EFFECTIVE_DATE}

1. CONTROLLER
Meow Meow is the data controller for personal data processed through the App.

2. LAWFUL BASES (Art. 6)
• Consent (Art. 6(1)(a)) — optional features, marketing.
• Contract (Art. 6(1)(b)) — providing the App.
• Legal obligation (Art. 6(1)(c)) — tax, KYC, law enforcement.
• Legitimate interest (Art. 6(1)(f)) — fraud, security, abuse prevention.

3. SPECIAL CATEGORY DATA (Art. 9)
Biometric face data is processed under Art. 9(2)(a) explicit consent for the limited purpose of liveness and gender verification. Templates are not retained beyond verification.

4. DATA SUBJECT RIGHTS (Art. 15-22)
Access, rectification, erasure, restriction, portability, objection, no automated decision without human review. Requests: privacy@meowmeow.app — response within 30 days.

5. INTERNATIONAL TRANSFERS (Chapter V)
Transfers to India and other non-adequacy countries rely on EU SCCs (Decision 2021/914) and the UK IDTA, with Transfer Impact Assessments and supplementary measures (encryption, pseudonymisation).

6. DPO & EU/UK REPRESENTATIVE
DPO: privacy@meowmeow.app
We will appoint a representative under GDPR Art. 27 / UK DPA Art. 27 for users in the EU/EEA and UK if our processing volume crosses the statutory threshold.

7. SUPERVISORY AUTHORITY
You may complain to your national Data Protection Authority — e.g., the Irish DPC, the UK ICO, the French CNIL.

8. CHILDREN (Art. 8)
The App is 18+ only; consent of a parent for users below 16 is not applicable.

9. DPIA
A Data Protection Impact Assessment has been performed for biometric verification, AI moderation, and women's earnings/KYC processing.`
  },
  {
    id: "data_storage_policy",
    title: "Data Localization & Storage",
    icon: <Database className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW — DATA LOCALIZATION & STORAGE POLICY
Effective: ${EFFECTIVE_DATE}

1. PRIMARY STORAGE
Primary databases and backups are located in India to comply with:
• Digital Personal Data Protection Act, 2023.
• RBI Storage of Payment System Data (April 2018) — payment data is stored only in India.
• SEBI / IRDAI guidance where applicable.

2. SECONDARY PROCESSING
Limited operational data may be processed in:
• Singapore, Japan, the EU, the United States — for sub-processors (Supabase, payment, email/SMS, AI gateway).
All such transfers use SCCs / IDTA / DPDP §16 mechanisms with encryption in transit and at rest.

3. PAYMENT DATA
Card / UPI credentials are tokenised by PCI-DSS Level 1 processors and never stored on our servers. Aggregated transaction records are retained for 8 years as required by the Companies Act 2013 and GST Act.

4. KYC DATA
Stored encrypted in India, segregated from operational tables, accessible only to authorised payout & compliance staff under audit logging.

5. USER CONSENT
By creating an account you provide express, informed consent under DPDP §6 / GDPR Art. 6 & 9 for storage in India and the cross-border transfers described above.

6. CERTIFICATIONS / FRAMEWORKS
Aligned with: ISO/IEC 27001:2022, ISO/IEC 27701, NIST CSF, SOC 2 Type II controls (sub-processor level).`
  },
  {
    id: "user_guidelines",
    title: "Community Guidelines",
    icon: <Users className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW — COMMUNITY GUIDELINES
Effective: ${EFFECTIVE_DATE}

DO
• Be respectful and treat every user with dignity.
• Use truthful information and your real photo.
• Use the in-app translator — chat in any language.
• Block and report anyone who makes you uncomfortable.

DON'T
• No sexual, nude, semi-nude, suggestive, or pornographic content.
• No harassment, hate speech, threats, defamation, casteism, racism, communalism, or discrimination.
• No requests for or sharing of phone, WhatsApp, Instagram, Snapchat, Telegram, email, address, UPI/Paytm/PhonePe/GPay, bank details, or any external contact.
• No requests for or offers of money, gifts, "loans", crypto, or investments.
• No prostitution, escort, sugar-baby, or commercial sexual services.
• No catfishing, impersonation, or use of someone else's photos.
• No spam, advertising, or promotion of third-party services.
• No bots, scripts, automation, or scraping.
• No content that exploits or endangers minors — instant ban + criminal report.
• No off-platform meet-ups arranged for sexual exploitation, trafficking, or abuse.

REPORTING
Use the in-app Report button or email report@meowmeow.app. Reports are reviewed within 24 hours; emergencies (CSAM, threats to life) are escalated immediately.`
  },
  {
    id: "anti_sexual_content",
    title: "Anti-Sexual Content & Child-Safety Policy",
    icon: <Ban className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW — ANTI-SEXUAL CONTENT & CHILD-SAFETY POLICY
Effective: ${EFFECTIVE_DATE}

ZERO TOLERANCE — sending, soliciting, or hinting at any of the following results in IMMEDIATE permanent ban, forfeiture of wallet/earnings, and reporting to authorities:
• Erotic chat, sexual roleplay, sexting, "dirty talk".
• Nudity, semi-nudity, sexual imagery.
• Pornographic, obscene, or vulgar language.
• Sexual harassment, unsolicited sexual advances, sextortion.
• Non-consensual intimate imagery ("revenge porn") — covered by IT Act §66E, BNS §75, and similar global laws.
• Voyeurism, upskirt, or recordings without consent.
• Solicitation of prostitution, escort, sugar-baby, or commercial sexual services.

CHILD SEXUAL ABUSE MATERIAL (CSAM) — ZERO TOLERANCE
• Any content involving a minor (real or simulated, AI-generated included) is a criminal offence under:
  – Protection of Children from Sexual Offences Act 2012 (POCSO),
  – Information Technology Act 2000 §67B,
  – Bharatiya Nyaya Sanhita 2023,
  – US 18 USC §2252/2252A, UK Protection of Children Act 1978, EU Directive 2011/93/EU, and global equivalents.
• We hash-match against industry CSAM databases and proactively scan for such material.
• Discoveries are preserved and reported to:
  – National Cyber Crime Reporting Portal (cybercrime.gov.in),
  – NCMEC CyberTipline (United States),
  – INTERPOL ICSE,
  – Local police of the offender's jurisdiction.
• Account, IP, device fingerprint, payment info, and chat metadata are preserved as required by law.

LIVE-CALL ABUSE
Live audio/video calls are subject to the same rules. Recording and AI scanning may be performed for safety/abuse detection in compliance with applicable wiretap and privacy laws; users are notified before each call.

CONSENT
Even between consenting adults, sexual content is prohibited on this platform. Use a service designed for adult content elsewhere.`
  },
  {
    id: "payments_policy",
    title: "Payments, Refunds & Payouts",
    icon: <CreditCard className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW — PAYMENTS, REFUNDS & PAYOUTS POLICY
Effective: ${EFFECTIVE_DATE}

A. WALLET RECHARGE (MEN)
• Recharge via Razorpay / Stripe / Paddle / authorised UPI in INR.
• Prices are inclusive of 18% GST under CGST/SGST/IGST Acts; GST invoice issued on request.
• Per-second pro-rated billing for chat, calls, and groups (rate card visible in-app).
• Wallet balance is non-transferable and tied to a single verified account.

B. REFUND POLICY
In line with the Consumer Protection Act 2019 and RBI guidelines:
• Recharges are non-refundable except where (i) duplicate charge, (ii) failed transaction with debit, (iii) verified system error.
• Refund requests must be raised within 7 days at billing@meowmeow.app; eligible refunds are processed within 7 working days to the original payment method.
• Unused coins are not refundable on account closure.

C. CHARGEBACKS / FRAUD
• Initiating a chargeback without contacting support first is treated as fraud.
• Result: permanent ban, blacklist with payment processors, forfeiture of balance, and possible legal action under BNS §316/318 (cheating), PMLA, and the Payment and Settlement Systems Act 2007.

D. PAYOUTS (WOMEN)
• Earnings ledger is the single source of truth (ledger_transactions table).
• Bi-monthly snapshot on the 1st and 16th of each month.
• Minimum payout threshold and processing time displayed in the Payouts screen.
• Payout to verified bank/UPI in KYC; mismatched names will be rejected.

E. TAXES (PAYOUTS)
• TDS may be deducted under the Income Tax Act 1961 (sec 194-O / 194-R / 194-S as applicable).
• Form 16A / TDS certificate issued where required.
• Women users are responsible for declaring earnings in their personal income-tax return.

F. ANTI-MONEY LAUNDERING
We comply with the Prevention of Money Laundering Act 2002 and FATF guidance. Suspicious transactions are reported to FIU-IND.`
  },
  {
    id: "content_moderation",
    title: "Content Moderation & Enforcement",
    icon: <Eye className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW — CONTENT MODERATION & ENFORCEMENT POLICY
Effective: ${EFFECTIVE_DATE}

1. WHAT WE MODERATE
Profile photos, display names, bio, chat messages, group names, call behaviour (where lawful), reports filed by users.

2. METHODS
• Pre-publication AI checks (face/gender, prohibited keywords, contact-detail patterns, abusive language).
• Real-time multilingual filters across 132+ languages.
• Post-publication user reports + 24-hour human review.
• Random audits of high-risk accounts.

3. ACTIONS
Tiered enforcement based on severity, history, and intent:
(i) Warning + content removal,
(ii) Temporary suspension (24 h – 30 days),
(iii) Permanent ban + forfeiture of balance/earnings,
(iv) Shadow-restriction of visibility,
(v) Law-enforcement referral (CSAM, threats, fraud, trafficking).

4. APPEALS
Users may appeal any action within 30 days at appeals@meowmeow.app. Human reviewer (different from the original moderator) decides within 15 days, in line with IT Rules 2021 §3(2) and the EU Digital Services Act Art. 20 (where applicable).

5. TRANSPARENCY
We publish an annual transparency report summarising removals, suspensions, government requests, and CSAM reports.

6. STATUTORY COMPLIANCE
We act as an "intermediary" under IT Act 2000 §79 and observe due-diligence under IT (Intermediary Guidelines and Digital Media Ethics Code) Rules 2021. We will take down unlawful content within 36 hours of a valid court / government order, and within 24 hours for non-consensual intimate imagery (Rule 3(2)(b)).`
  },
  {
    id: "age_verification",
    title: "Age Verification (18+ Only)",
    icon: <UserCheck className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW — AGE VERIFICATION POLICY
Effective: ${EFFECTIVE_DATE}

• Strict minimum age: 18 years (or higher local age of majority).
• Date of birth is collected at registration; AI age-estimation cross-checks the live selfie.
• Suspected underage accounts are immediately suspended; the user is asked for government-ID proof.
• If under-18 status is confirmed, the account and all data are deleted within 7 days, and where there is reason to believe the minor is at risk, a report is filed under POCSO 2012, IT Act §67B, and equivalent foreign laws.
• Misrepresentation of age is a fraud against the platform and may be a criminal offence (BNS §318 — cheating).
• Parents/guardians who discover that a minor created an account may write to safety@meowmeow.app for immediate removal.`
  },
  {
    id: "ai_disclosure",
    title: "AI Usage Disclosure",
    icon: <Bot className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW — AI USAGE DISCLOSURE
Effective: ${EFFECTIVE_DATE}

We use artificial intelligence to keep the App safe, fair, and useful.

USED FOR
• Face & liveness detection (anti-spoofing).
• Gender estimation from selfie.
• Age estimation.
• Real-time language detection & translation across 100+ languages.
• Prohibited-content classification (sexual, violent, hateful, contact-info patterns).
• Fraud, bot, and abuse detection.

NOT USED FOR
• Final permanent-ban decisions without human review.
• Final payout approval/rejection without human review.
• Profiling for advertising, political, or insurance pricing purposes.
• Sale of biometric or behavioural data to third parties.

GOVERNANCE
• Models are evaluated for bias on Indian skin tones, languages, and demographics.
• EU AI Act (Regulation 2024/1689): biometric categorisation and emotion-inference are limited to safety contexts permitted under Art. 5 / Annex III; users are informed when interacting with AI features.
• You can request human review of any AI-driven decision at ai-review@meowmeow.app within 30 days.`
  },
  {
    id: "data_retention",
    title: "Data Retention & Deletion",
    icon: <Clock className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW — DATA RETENTION & DELETION POLICY
Effective: ${EFFECTIVE_DATE}

Data Type                       | Retention
--------------------------------|------------------------------------------
Chat message bodies             | Auto-deleted every 15 minutes
Chat sessions metadata          | 30 days, then anonymised
Audio/video call recordings     | NOT recorded (signalling logs 30 days)
Account & profile               | Until deletion + 30-day grace period
Wallet ledger transactions      | 8 years (Companies Act, GST Act)
KYC documents (women)           | 8 years from last transaction (PMLA)
TDS / tax records               | 8 years (Income Tax Act 1961)
Server / security logs          | 30–180 days
Abuse / fraud evidence          | 90 days, longer if under investigation
CSAM evidence                   | Preserved indefinitely for law enforcement
Court / government holds        | Until release order

DELETION RIGHT
Request account deletion any time from Settings or at privacy@meowmeow.app. We delete or anonymise all non-statutorily-retained data within 30 days, in compliance with DPDP §12, GDPR Art.17, CCPA / CPRA right-to-delete, and similar laws.

EXCEPTIONS
We may retain limited data where necessary to: (a) comply with law, (b) resolve disputes, (c) enforce agreements, (d) protect against fraud, (e) preserve evidence for criminal proceedings.`
  }
];

const TermsAgreementScreen = () => {
  const navigate = useNavigate();
  useRegistrationGuard([{ key: "userEmail" }, { key: "userPassword", storage: "session" }], "/password-setup");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | undefined>("terms_of_service");
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [agreeAll, setAgreeAll] = useState(false);

  const allRequiredAgreed = legalDocuments
    .filter(doc => doc.required)
    .every(doc => consents[doc.id]);

  const agreedCount = Object.values(consents).filter(Boolean).length;

  const handleToggleConsent = (docId: string) => {
    setConsents(prev => {
      const newConsents = { ...prev, [docId]: !prev[docId] };
      const allAgreed = legalDocuments.every(doc => newConsents[doc.id]);
      setAgreeAll(allAgreed);
      return newConsents;
    });
  };

  const handleAgreeAll = () => {
    const newAgreeAll = !agreeAll;
    setAgreeAll(newAgreeAll);
    const newConsents: Record<string, boolean> = {};
    legalDocuments.forEach(doc => {
      newConsents[doc.id] = newAgreeAll;
    });
    setConsents(newConsents);
  };

  const handleSubmit = async () => {
    if (!allRequiredAgreed) {
      toast({
        title: "Agreement required",
        description: "Please agree to all required policies to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get registration data from localStorage
      const email = sessionStorage.getItem("userEmail") || "";
      const password = sessionStorage.getItem("userPassword") || "";
      const fullName = sessionStorage.getItem("userName") || "";
      const gender = sessionStorage.getItem("userGender") || "";
      const phone = sessionStorage.getItem("userPhone") || "";

      // Re-validate password strength to prevent bypass via direct sessionStorage manipulation
      const passwordValid =
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[!@#$%^&*(),.?":{}|<>]/.test(password);

      if (!email || !password || !passwordValid) {
        toast({
          title: "Registration incomplete",
          description: !passwordValid && password
            ? "Password does not meet strength requirements. Please go back and set a valid password."
            : "Please complete all registration steps.",
          variant: "destructive",
        });
        navigate(passwordValid ? "/register" : "/password-setup", { replace: true });
        return;
      }

      if (!gender) {
        toast({
          title: "Gender required",
          description: "Please go back and select your gender.",
          variant: "destructive",
        });
        navigate("/basic-info");
        return;
      }

      // Create user account with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            gender: gender,
            phone: phone,
          }
        }
      });

      if (authError) {
        console.error("Auth error:", authError);
        toast({
          title: "Registration failed",
          description: authError.message || "Failed to create account. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const user = authData.user;

      if (!user) {
        toast({
          title: "Registration failed",
          description: "Failed to create account. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Check if user already exists (identities is empty means duplicate email)
      if (user.identities?.length === 0) {
        toast({
          title: "Email already registered",
          description: "This email is already registered. Please try logging in instead.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Sign in the user immediately after signup to get a session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (signInError) {
        console.error("Sign in error:", signInError);
        toast({
          title: "Login failed",
          description: "Account created but couldn't sign in. Please try logging in manually.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // Save all consent data
      const { error: consentError } = await supabase
        .from("user_consent")
        .upsert({
          user_id: user.id,
          agreed_terms: consents.terms_of_service,
          gdpr_consent: consents.gdpr_compliance,
          ccpa_consent: consents.gdpr_compliance,
          dpdp_consent: consents.data_storage_policy,
          terms_version: "1.0",
          consent_timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
        });

      if (consentError) throw consentError;

      // Get remaining registration data from localStorage
      const dateOfBirth = sessionStorage.getItem("userDob") || sessionStorage.getItem("userDateOfBirth") || "";
      const countryCode = sessionStorage.getItem("userCountry") || "";
      const stateCode = sessionStorage.getItem("userState") || "";
      const city = sessionStorage.getItem("userCity") || "";
      const latitude = sessionStorage.getItem("userLatitude");
      const longitude = sessionStorage.getItem("userLongitude");
      const languageCode = sessionStorage.getItem("selectedLanguage") || sessionStorage.getItem("userPrimaryLanguage") || "";
      const pendingPhotoData = sessionStorage.getItem("pendingPhotoData") || "";
      const pendingAdditionalPhotos = JSON.parse(sessionStorage.getItem("pendingAdditionalPhotos") || "[]");

      // Convert country code to full name
      const countryData = countries.find(c => c.code === countryCode);
      const countryName = countryData?.name || countryCode;

      // Convert state code to full name
      let stateName = stateCode;
      if (countryCode && stateCode) {
        const statesForCountry = getStatesForCountry(countryCode);
        const stateData = statesForCountry.find(s => s.code === stateCode);
        stateName = stateData?.name || stateCode;
      }

      // Convert language code to full name
      const languageData = languages.find(l => l.code === languageCode);
      const languageName = languageData?.name || languageCode;
      
      // Get personal details from PersonalDetailsScreen
      const personalDetails = JSON.parse(sessionStorage.getItem("userPersonalDetails") || "{}");

      // Calculate age from DOB
      let age: number | null = null;
      if (dateOfBirth) {
        const dob = new Date(dateOfBirth);
        const today = new Date();
        age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
      }

      // Upload selfie photo if exists
      let photoUrl: string | null = null;
      if (pendingPhotoData && pendingPhotoData.startsWith("data:image")) {
        const base64Data = pendingPhotoData.split(",")[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/jpeg" });
        
        const fileName = `${user.id}/selfie_${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("profile-photos")
          .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });
        
        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(fileName);
          photoUrl = urlData.publicUrl;
        }
      }

      // Build complete profile data including ALL registration fields
      const profileData: any = {
        user_id: user.id,
        email: email, // Store email in profiles table
        full_name: fullName,
        gender: gender.toLowerCase(),
        phone: phone,
        date_of_birth: dateOfBirth || null,
        age: age,
        country: countryName,
        state: stateName,
        city: city || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        primary_language: languageName,
        preferred_language: languageName, // Also set preferred language
        photo_url: photoUrl,
        // Personal details from PersonalDetailsScreen
        bio: personalDetails.bio || null,
        height_cm: personalDetails.height_cm || null,
        occupation: personalDetails.occupation || null,
        body_type: personalDetails.body_type || null,
        education_level: personalDetails.education_level || null,
        marital_status: personalDetails.marital_status || null,
        religion: personalDetails.religion || null,
        smoking_habit: personalDetails.smoking_habit || null,
        drinking_habit: personalDetails.drinking_habit || null,
        dietary_preference: personalDetails.dietary_preference || null,
        fitness_level: personalDetails.fitness_level || null,
        has_children: personalDetails.has_children || null,
        pet_preference: personalDetails.pet_preference || null,
        travel_frequency: personalDetails.travel_frequency || null,
        personality_type: personalDetails.personality_type || null,
        zodiac_sign: personalDetails.zodiac_sign || null,
        interests: personalDetails.interests || [],
        life_goals: personalDetails.life_goals || [],
        account_status: "active",
        approval_status: gender.toLowerCase() === "female" ? "pending" : "approved",
        updated_at: new Date().toISOString(),
      };

      // Save to profiles table (upsert with retry for resilience)
      let profileError: any = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const { error } = await supabase
          .from("profiles")
          .upsert(profileData, { onConflict: "user_id" });
        profileError = error;
        if (!error) break;
        if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
      }

      if (profileError) {
        console.error("Profile creation failed after retries:", profileError);
        // Sign out to prevent broken logged-in state with no profile
        await supabase.auth.signOut();
        toast({
          title: "Registration failed",
          description: "Account was created but profile setup failed. Please try registering again.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // NOTE: Profile data is synced to gender-specific tables (male_profiles/female_profiles)
      // via database trigger. Languages support all 386+ languages from languages.ts
      // The trigger automatically syncs primary_language and preferred_language fields

      // Save selfie as primary photo in user_photos
      if (photoUrl) {
        await supabase.from("user_photos").upsert({
          user_id: user.id,
          photo_url: photoUrl,
          photo_type: "selfie",
          is_primary: true,
          display_order: 0,
        }, { onConflict: "user_id,photo_url" });
      }

      // Upload and save additional photos
      for (let i = 0; i < pendingAdditionalPhotos.length; i++) {
        const photoData = pendingAdditionalPhotos[i];
        if (photoData && photoData.startsWith("data:image")) {
          const base64Data = photoData.split(",")[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let j = 0; j < byteCharacters.length; j++) {
            byteNumbers[j] = byteCharacters.charCodeAt(j);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: "image/jpeg" });
          
          const fileName = `${user.id}/photo_${i + 1}_${Date.now()}.jpg`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("profile-photos")
            .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });
          
          if (!uploadError && uploadData) {
            const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(fileName);
            await supabase.from("user_photos").insert({
              user_id: user.id,
              photo_url: urlData.publicUrl,
              photo_type: "gallery",
              is_primary: false,
              display_order: i + 1,
            });
          }
        }
      }

      // Create wallet for user (unified wallets table)
      await supabase.from("wallets").upsert({
        user_id: user.id,
        balance: 0,
        currency: "INR",
        gender: gender.toLowerCase() === "female" ? "women" : "men",
      }, { onConflict: "user_id" });

      // Save language preferences from LanguagePreferencesScreen to user_languages table
      const savedLanguagePrefs = sessionStorage.getItem("userLanguagePreferences");
      if (savedLanguagePrefs) {
        try {
          const langPrefs = JSON.parse(savedLanguagePrefs) as Array<{ code: string; name: string }>;
          if (langPrefs.length > 0) {
            const langRecords = langPrefs.map((lang) => ({
              user_id: user.id,
              language_code: lang.code,
              language_name: lang.name,
            }));
            await supabase.from("user_languages").upsert(langRecords, { onConflict: "user_id,language_code" });
          }
        } catch {
          // Non-critical - language preferences can be set later from settings
        }
      }

      toast({
        title: "Registration Complete!",
        description: "Your account is being verified.",
      });

      // Navigate to AI processing for verification
      navigate("/ai-processing");
    } catch (error) {
      console.error("Error saving registration:", error);
      toast({
        title: "Error",
        description: "Failed to complete registration. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Always clear sensitive registration data regardless of success/failure
      const registrationKeys = [
        "pendingPhotoData", "pendingAdditionalPhotos", "userName", "userEmail",
        "userPhone", "userGender", "userDob", "userDateOfBirth", "userCountry",
        "userState", "userCity", "userLatitude", "userLongitude",
        "userPrimaryLanguage", "userLanguagePreferences", "userPersonalDetails",
      ];
      registrationKeys.forEach(key => sessionStorage.removeItem(key));
      sessionStorage.removeItem("userPassword");
      sessionStorage.removeItem("selectedLanguage");
      sessionStorage.removeItem("selectedCountry");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-background text-foreground">
      {/* Aurora Background */}
      <Suspense fallback={
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-background to-secondary/30" />
      }>
        <AuroraBackground />
      </Suspense>

      {/* Header */}
      <header className="px-6 pt-8 pb-4 relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/password-setup")}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <ProgressIndicator currentStep={9} totalSteps={10} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <Card className="w-full max-w-2xl p-6 md:p-8 space-y-6 bg-card/70 backdrop-blur-xl border-primary/20 shadow-[0_0_40px_hsl(var(--primary)/0.1)]">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">Final Step: Legal Agreements</h1>
            <p className="text-muted-foreground">
              Please read and accept all 12 policies to complete your registration
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                allRequiredAgreed 
                  ? 'bg-accent/10 text-accent' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {agreedCount}/{legalDocuments.length} Accepted
              </div>
            </div>
          </div>

          {/* Agree All Checkbox */}
          <label
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
              agreeAll
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Checkbox
              checked={agreeAll}
              onCheckedChange={handleAgreeAll}
              className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
            />
            <div className="flex-1">
              <span className="font-semibold text-foreground">
                I agree to ALL policies and terms
              </span>
              <p className="text-sm text-muted-foreground">
                Check this to accept all {legalDocuments.length} legal documents at once
              </p>
            </div>
            {agreeAll && (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            )}
          </label>

          {/* Legal Documents Accordion */}
          <ScrollArea className="h-[400px] rounded-xl border border-border bg-muted/20 p-4">
            <Accordion 
              type="single" 
              collapsible 
              value={expandedDoc}
              onValueChange={setExpandedDoc}
              className="space-y-2"
            >
              {legalDocuments.map((doc) => (
                <AccordionItem 
                  key={doc.id} 
                  value={doc.id}
                  className={`border rounded-lg px-4 transition-all ${
                    consents[doc.id] 
                      ? 'border-emerald-500/50 bg-emerald-500/5' 
                      : 'border-border bg-card/50'
                  }`}
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        consents[doc.id] 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {doc.icon}
                      </div>
                      <span className="font-medium text-foreground text-left">
                        {doc.title}
                      </span>
                      {doc.required && (
                        <span className="text-xs text-destructive">*Required</span>
                      )}
                      {consents[doc.id] && (
                        <Check className="w-4 h-4 text-emerald-500 ml-auto mr-2" />
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="bg-muted/50 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
                      <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                        {doc.content}
                      </pre>
                    </div>
                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        consents[doc.id]
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Checkbox
                        checked={consents[doc.id] || false}
                        onCheckedChange={() => handleToggleConsent(doc.id)}
                        className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                      <span className="text-sm font-medium text-foreground">
                        I have read and agree to the {doc.title}
                      </span>
                    </label>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              variant="auroraOutline"
              onClick={() => navigate("/password-setup")}
              className="flex-1 h-12"
            >
              Back
            </Button>
            <Button
              variant="aurora"
              onClick={handleSubmit}
              disabled={isLoading || !allRequiredAgreed}
              className="flex-1 h-12 text-base font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Accept All & Continue
                </>
              )}
            </Button>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-center text-muted-foreground">
            By completing registration, your consent to all 12 documents will be recorded with a timestamp for GDPR, CCPA, and DPDP compliance.
            You can withdraw consent at any time from Settings.
          </p>
        </Card>
      </main>
    </div>
  );
};

export default TermsAgreementScreen;
