-- Two new courses, distinct topics not already covered by the existing
-- catalog (mobile/device security, physical/workplace security) — grows
-- the real catalog to match what the local preview file demonstrates
-- (frontend/src/data/cybersachetCourses.js), so licensed organizations get
-- the same breadth a prospect already sees in preview mode. Same shape as
-- every course added since migration 0037: modules, category, free_tier,
-- key takeaways, and lesson comprehension checks from day one — nothing
-- here needs a later migration to "catch up" the way 0042/0043/0045 had to
-- for the original five.

insert into cybersachet_courses (slug, title, description, level, estimated_minutes, published, sort_order, category, free_tier) values
  ('mobile-device-security', 'Mobile & Device Security', 'Lock screens, app permissions, and public charging risks — the everyday habits that keep a phone or laptop safe when it''s lost, stolen, or just out in public.', 'beginner', 13, true, 5, 'endpoint-security', false),
  ('physical-security-workplace-awareness', 'Physical Security & Workplace Awareness', 'Clean desks, badge discipline, shoulder surfing, and secure disposal — the physical-world habits that protect information no firewall ever touches.', 'beginner', 11, true, 6, 'physical-security', false)
on conflict (slug) do nothing;

do $$
declare
  v_course_id uuid;
  v_m1 uuid;
  v_m2 uuid;
begin
  -- Mobile & Device Security — guarded so re-running this migration (e.g.
  -- after a partial failure) doesn't duplicate modules/lessons/questions;
  -- the course row itself is already guarded by `on conflict (slug)` above.
  select id into v_course_id from cybersachet_courses where slug = 'mobile-device-security';
  if not exists (select 1 from cybersachet_modules where course_id = v_course_id) then
  insert into cybersachet_modules (course_id, title, sort_order) values (v_course_id, 'Everyday Device Habits', 0) returning id into v_m1;
  insert into cybersachet_modules (course_id, title, sort_order) values (v_course_id, 'Staying Safe On the Go', 1) returning id into v_m2;

  insert into cybersachet_lessons (course_id, module_id, title, body, key_takeaway, sort_order, check_question, check_choices, check_correct_index) values
  (v_course_id, v_m1, 'Lock screens and lost devices',
   'A phone or laptop without a lock screen is an open book to anyone who finds it — email, banking apps, saved passwords, and every account you''re logged into. Enable a PIN, password, or biometric lock on every device, and set the auto-lock timeout as short as you can tolerate (30 seconds to 1 minute for a phone). Also enroll every device in Find My iPhone, Find My Device, or your company''s mobile device management — the ability to remotely locate, lock, or wipe a device is what actually limits the damage once it''s gone.',
   'A short auto-lock timeout plus remote-wipe enrollment is the single biggest protection against a lost or stolen device.', 0,
   'What''s the single most effective protection against a lost or stolen device?', '["A strong email password alone", "A lock screen with a short auto-lock timeout, plus remote-wipe enrollment", "Keeping the device turned off when not in use", "Using a screen protector"]'::jsonb, 1),
  (v_course_id, v_m1, 'App permissions you should question',
   'Apps routinely ask for more access than they need — a flashlight app requesting your contacts, a game requesting your microphone. Review app permissions periodically (in your phone''s Settings, not just when first installing) and revoke anything that doesn''t make sense for what the app actually does. Only install apps from official app stores; sideloading apps from outside them skips the security review those stores perform and is one of the most common ways malicious apps end up on a device.',
   'Review and revoke app permissions that don''t match what the app actually needs to do — and stick to official app stores.', 1,
   'What''s the safest habit around app permissions?', '["Grant everything an app asks for so it works properly", "Review and revoke permissions an app doesn''t actually need for its function", "Only worry about permissions for banking apps", "Permissions don''t matter if the app has good reviews"]'::jsonb, 1),
  (v_course_id, v_m2, 'Public Wi-Fi, public chargers, and public USB ports',
   E'"Juice jacking" is real: a compromised public USB charging port (at an airport, cafe, or hotel) can be used to install malware or steal data the moment a phone is plugged in, because USB carries data as well as power. Carry your own charger and cable, or a portable battery pack, instead of plugging into a public port. Public Wi-Fi itself isn''t automatically dangerous for browsing encrypted (https) sites, but avoid logging into sensitive accounts on it without your company''s VPN — an attacker on the same network can potentially see unencrypted traffic.',
   'Bring your own charger or a battery pack instead of using public USB charging ports — USB carries data, not just power.', 2,
   'What''s the safest way to charge your phone in a public place like an airport?', '["Any public USB port is fine as long as it''s from a reputable location", "Use your own charger and cable, or a portable battery pack", "Public charging ports are always safe for phones, only laptops are at risk", "Ask a stranger to borrow their charger instead"]'::jsonb, 1),
  (v_course_id, v_m2, 'If your device is lost or stolen',
   'Act immediately, not after a day of hoping it turns up. Use Find My Device (or your company''s mobile device management) to remotely locate, lock, or wipe it. Change the password for any account you were logged into on that device, starting with email, since it can reset everything else. Report a lost or stolen work device to IT/security right away — the faster it''s reported, the sooner access to company systems can be revoked from that device specifically.',
   'Remotely lock or wipe the device first, then change passwords for anything you were logged into, and report it to IT immediately.', 3,
   'What should you do first if a work phone is lost or stolen?', '["Wait 24 hours in case it''s found", "Remotely lock or wipe it, then report it to IT/security immediately", "Only worry about it if it had banking apps installed", "Buy a replacement before reporting it"]'::jsonb, 1)
  on conflict do nothing;

  insert into cybersachet_quiz_questions (course_id, question, choices, question_type, correct_index, sort_order) values
  (v_course_id, 'What''s the single most effective protection against a lost or stolen device?', '["A strong email password alone", "A lock screen with a short auto-lock timeout", "Keeping the device turned off", "A screen protector"]'::jsonb, 'single', 1, 0),
  (v_course_id, 'Why should you review an app''s permissions periodically?', '["Apps often request more access than they actually need", "It''s required by app stores", "It makes the app run faster", "It''s only necessary for banking apps"]'::jsonb, 'single', 0, 1),
  (v_course_id, 'What is "juice jacking"?', '["A phone battery defect", "Using a compromised public USB charging port to install malware or steal data", "A type of phishing email", "An app permission setting"]'::jsonb, 'single', 1, 2),
  (v_course_id, 'Your work phone is stolen. What''s the right first move?', '["Wait to see if it''s returned", "Remotely lock or wipe it, then report it to IT immediately", "Post about it on social media", "Change your email password only after a week"]'::jsonb, 'single', 1, 3)
  on conflict do nothing;
  end if;

  -- Physical Security & Workplace Awareness
  select id into v_course_id from cybersachet_courses where slug = 'physical-security-workplace-awareness';
  if not exists (select 1 from cybersachet_modules where course_id = v_course_id) then
  insert into cybersachet_modules (course_id, title, sort_order) values (v_course_id, 'Workspace Habits', 0) returning id into v_m1;
  insert into cybersachet_modules (course_id, title, sort_order) values (v_course_id, 'Awareness & Disposal', 1) returning id into v_m2;

  insert into cybersachet_lessons (course_id, module_id, title, body, key_takeaway, sort_order, check_question, check_choices, check_correct_index) values
  (v_course_id, v_m1, 'Clean desk, locked screen',
   'Sensitive printouts, sticky notes with passwords, and an unlocked computer left unattended are a real risk even inside a supposedly safe office — cleaners, contractors, delivery people, and other visitors pass through spaces employees assume are private. Lock your screen every time you step away, even for a minute (Windows+L, or Control+Command+Q on a Mac) — it becomes automatic within a week of doing it deliberately. Put sensitive documents away, not face-up on a desk, when you''re not actively using them.',
   'Lock your screen every time you step away, even for a minute — it becomes automatic once you do it deliberately for a few days.', 0,
   'When should you lock your computer screen when stepping away from your desk?', '["Only if you''ll be gone more than 30 minutes", "Every time, even for a minute", "Only in shared or public workspaces", "Only if sensitive documents are visible"]'::jsonb, 1),
  (v_course_id, v_m1, 'Visitors, badges, and access',
   E'Wear your badge visibly and never lend it to anyone, even a coworker who forgot theirs — badge access is tied to you personally, and "just this once" is exactly how tailgating and unauthorized access attempts succeed. Escort visitors rather than letting them wander a secured area alone, and it''s normal and expected to politely stop someone without a visible badge and ask who they''re visiting, even if that feels awkward the first time.',
   'Never lend your badge to anyone, even a coworker — access is tied to you personally, not to "just this once."', 1,
   'A coworker forgot their badge and asks to borrow yours for the day. Best response?', '["Lend it, since you trust them", "Decline and direct them to reception or security to get a temporary badge", "Let them follow you through doors all day instead", "Only lend it if they''re on your team"]'::jsonb, 1),
  (v_course_id, v_m2, 'Shoulder surfing and public spaces',
   'Working from a cafe, train, or shared coworking space means anyone nearby can potentially see your screen — this is called shoulder surfing, and it''s a low-effort way to catch a glimpse of a password, an email, or confidential figures. Use a privacy screen filter for sensitive work in public, position your screen away from foot traffic where possible, and avoid discussing confidential information aloud in public spaces, including on phone calls.',
   'Anyone nearby can potentially see your screen in a public space — position it away from foot traffic and use a privacy filter for sensitive work.', 2,
   'What is "shoulder surfing"?', '["A type of phishing email", "Someone nearby visually observing your screen to catch sensitive information", "A malware infection method", "An unlocked-screen policy violation"]'::jsonb, 1),
  (v_course_id, v_m2, 'Disposing of sensitive material safely',
   E'"Delete" is not the same as "destroyed." Shred physical documents containing sensitive information rather than putting them in regular trash or recycling — a shredder bin, not a wastebasket. For old computers, phones, or drives, use your organization''s secure disposal or data-wiping process rather than simply throwing hardware away; deleted files on a drive that''s discarded intact can often still be recovered by anyone who finds it.',
   'Shred sensitive paper documents and use your organization''s secure wipe/disposal process for old hardware — deleting files isn''t the same as destroying them.', 3,
   'Why isn''t throwing an old laptop in the trash a safe way to dispose of it?', '["It''s bad for the environment only", "Deleted files can often still be recovered from an intact drive", "It voids the warranty", "It''s only a risk for company-owned devices"]'::jsonb, 1)
  on conflict do nothing;

  insert into cybersachet_quiz_questions (course_id, question, choices, question_type, correct_index, sort_order) values
  (v_course_id, 'When should you lock your screen when stepping away from your desk?', '["Only for long breaks", "Every time, even briefly", "Only outside the office", "Only if others are nearby"]'::jsonb, 'single', 1, 0),
  (v_course_id, 'A coworker without their badge asks to follow you through a secured door. Best practice?', '["Let them in since you recognize them", "It''s normal and expected to ask them to badge in themselves or go through reception", "Only let them in if they''re senior to you", "Report it only if they seem suspicious"]'::jsonb, 'single', 1, 1),
  (v_course_id, 'What''s the best defense against shoulder surfing in a public space?', '["Working faster so less is visible", "A privacy screen filter and positioning your screen away from foot traffic", "Only checking email in public", "It''s not a real risk outside the office"]'::jsonb, 'single', 1, 2),
  (v_course_id, 'What''s the safest way to dispose of an old company laptop?', '["Throw it in the regular trash", "Use your organization''s secure wipe/disposal process", "Give it away after deleting a few files", "Remove the sticker with the company logo only"]'::jsonb, 'single', 1, 3)
  on conflict do nothing;
  end if;
end $$;
