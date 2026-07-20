// Real CyberSachet curriculum, authored once here and consumed two ways:
//   1. Locally, right now, via the `local*` functions below (localStorage-
//      backed enroll/progress/quiz — no database required).
//   2. Later, as a Supabase seed — see supabase/migrations/0040 (content),
//      0042/0043 (per-lesson comprehension checks), and 0045 (modules,
//      categories, free-tier flag, key takeaways, and the two new question
//      types) — the exact same shape. Once applied and an org is licensed,
//      CyberSachetTraining.jsx switches to the real RPCs automatically —
//      this file becomes dead code, not a rewrite.
//
// Field names intentionally match what the real endpoints return (see
// api/endpoints.js) so the exact same UI components render both.
//
// Every lesson carries a one-question comprehension check
// (`check: {question, choices, correctIndex}`) — completing a lesson
// requires answering it correctly; getLocalLessons() strips correctIndex
// before handing lessons to the UI (mirroring the boundary list_course_quiz()
// enforces server-side) so the answer can't be read from devtools —
// verification happens inside localCheckLessonAnswer() below.
//
// Quiz questions support three types, matching migration 0045:
//   single   -> correctIndex (an int)
//   multiple -> correctIndexes (int[], graded as a set — order doesn't matter)
//   ordering -> correctOrder (int[], the right sequence of choice indexes —
//               order matters completely)

const COURSES = [
  {
    id: "local-phishing-awareness",
    slug: "phishing-awareness",
    title: "Phishing Awareness",
    description: "Recognize the emails, texts, and calls attackers use to steal credentials — and what to do the moment you suspect one.",
    level: "beginner",
    estimatedMinutes: 15,
    category: "email-security",
    freeTier: true,
    modules: [
      { id: "m1", title: "Recognizing Phishing" },
      { id: "m2", title: "Responding & Preventing" }
    ],
    lessons: [
      {
        id: "l1",
        moduleId: "m1",
        title: "What phishing actually is",
        body: "Phishing is a message designed to make you act before you think — click a link, open an attachment, or hand over a password — by impersonating someone or something you trust: your bank, your IT department, a delivery company, even a coworker. It doesn't need to fool everyone. Out of a thousand emails, attackers only need a handful of clicks to get a foothold. That's why it's the single most common way organizations get breached — not sophisticated hacking, just one tired click on a Monday morning.",
        keyTakeaway: "Phishing wins on volume, not sophistication — it only needs a handful of clicks out of thousands of attempts.",
        check: { question: "Why is phishing effective even though it doesn't fool everyone?", choices: ["It always uses malware", "Attackers only need a small number of clicks to succeed", "It exclusively targets executives", "It requires no technical skill at all"], correctIndex: 1 }
      },
      {
        id: "l2",
        moduleId: "m1",
        title: "The red flags that give it away",
        body: "Urgency and fear are the biggest tells: \"Your account will be suspended in 24 hours,\" \"Unusual sign-in detected,\" \"Invoice overdue — pay now.\" Real IT and finance departments rarely operate on a countdown timer. Other signals: a sender address that's almost right (support@paypa1.com), a generic greeting instead of your name, a link where the visible text doesn't match where it actually goes (hover before you click), and requests to do something outside the normal process — like a CEO suddenly emailing you personally to buy gift cards.",
        keyTakeaway: "Manufactured urgency is the single biggest tell — real IT and finance requests rarely come with a countdown timer.",
        check: { question: "Which of these is described as one of the biggest phishing tells?", choices: ["A long email signature", "Manufactured urgency or fear", "Perfect spelling and grammar", "An email sent during business hours"], correctIndex: 1 }
      },
      {
        id: "l3",
        moduleId: "m2",
        title: "If you already clicked",
        body: "Don't panic, and don't hide it. Disconnect the device from Wi-Fi if you can do it immediately. If you entered a password, change it right away — on that site and anywhere else you reused it. Report it to your IT/security contact immediately; the faster they know, the smaller the blast radius. Every real incident response process assumes people will click sometimes — the only mistake that makes things worse is staying quiet about it.",
        keyTakeaway: "Speed and honesty beat quiet embarrassment — disconnect, change the password, and report it immediately.",
        check: { question: "What should you do first if you already clicked a phishing link?", choices: ["Wait to see if anything bad happens", "Disconnect from the network and change any entered passwords", "Delete the email and say nothing", "Restart your computer right away"], correctIndex: 1 }
      },
      {
        id: "l4",
        moduleId: "m2",
        title: "Building a verify-first habit",
        body: "Before acting on an unexpected request — a password reset, a wire transfer, a link to \"review a document\" — verify through a second channel you already trust: call the person back on a known number, check the vendor portal directly instead of clicking the email link, or ask a coworker in person or on Slack. This single habit defeats the vast majority of phishing, because attackers are counting on you to act in the moment, not to pause and check.",
        keyTakeaway: "Verify any unexpected request through a channel you already trust, never through the message itself.",
        check: { question: "What is the \"verify-first\" habit described in this lesson?", choices: ["Verifying your own identity to IT before logging in", "Confirming unexpected requests through a separate, already-trusted channel", "Verifying an email's spelling before reading it", "Checking your spam folder daily"], correctIndex: 1 }
      }
    ],
    quiz: [
      { id: "q1", questionType: "single", question: "What's the single biggest tell of a phishing message?", choices: ["A logo that looks slightly different", "Artificial urgency pushing you to act immediately", "The email arrived outside business hours", "It was sent to multiple people"], correctIndex: 1 },
      { id: "q2", questionType: "single", question: "You hover over a link and the URL doesn't match the text. What should you do?", choices: ["Click it carefully, just don't enter any passwords", "Forward it to a friend to check", "Don't click — treat the mismatch as a red flag", "Reply asking the sender to confirm"], correctIndex: 2 },
      { id: "q3", questionType: "single", question: "You realize you just entered your password on a fake login page. First move?", choices: ["Wait and see if anything happens", "Change that password immediately and report it", "Delete the email and move on", "Only worry if you get a strange notification"], correctIndex: 1 },
      { id: "q4", questionType: "single", question: "A \"verify-first\" habit means:", choices: ["Trusting any email that looks professionally designed", "Confirming unexpected requests through a separate, known channel", "Only opening emails from contacts already in your address book", "Reporting every single email to IT before reading it"], correctIndex: 1 },
      { id: "q5", questionType: "multiple", question: "Select every real phishing red flag (choose all that apply):", choices: ["Manufactured urgency or a countdown", "A sender address that's almost right, like support@paypa1.com", "The email was sent on a weekday", "A link whose visible text doesn't match where it actually goes"], correctIndexes: [0, 1, 3] },
      { id: "q6", questionType: "ordering", question: "Arrange the steps in the right order for responding to a suspected phishing click:", choices: ["Report it to IT/security", "Disconnect the device from the network", "Change any passwords you entered", "Notice the message looks off"], correctOrder: [3, 1, 2, 0] }
    ]
  },
  {
    id: "local-password-mfa",
    slug: "password-security-mfa",
    title: "Password Security & MFA",
    description: "Why passwords keep failing organizations, and the two habits — passphrases and multi-factor authentication — that actually stop account takeovers.",
    level: "beginner",
    estimatedMinutes: 12,
    category: "identity",
    freeTier: true,
    modules: [
      { id: "m1", title: "Why Passwords Fail" },
      { id: "m2", title: "Modern Defenses" }
    ],
    lessons: [
      {
        id: "l1",
        moduleId: "m1",
        title: "Why passwords fail",
        body: "Most account breaches don't come from someone guessing your password character by character — they come from reuse. If one site you use gets breached and your password leaks, attackers automatically try that same email/password pair on banks, email providers, and work accounts. A single reused password can turn one small breach into a dozen compromised accounts. Complexity rules (\"one number, one symbol\") mostly just make passwords harder to remember without making them meaningfully harder to crack — length and uniqueness matter far more.",
        keyTakeaway: "Reuse — not weak individual passwords — is what turns one small breach into a dozen compromised accounts.",
        check: { question: "Why is password reuse so dangerous, per this lesson?", choices: ["It's against most companies' style guide", "One leaked password can be tried across many other accounts", "It makes typing slower", "It voids warranty on hardware"], correctIndex: 1 }
      },
      {
        id: "l2",
        moduleId: "m1",
        title: "Passphrases beat passwords",
        body: "A long, random passphrase like \"correct-horse-battery-staple-42\" is both easier to remember and far harder to crack than \"P@ssw0rd1!\" — length is what defeats modern cracking hardware, not symbol-stuffing. The best passwords, though, are ones you never have to remember at all: fully random strings generated and stored by a password manager. Reserve your own memory for one strong master passphrase that unlocks the manager.",
        keyTakeaway: "Length beats symbol-stuffing: a long passphrase resists cracking hardware better than a short complex password.",
        check: { question: "What makes a passphrase stronger than a short complex password?", choices: ["It contains more special characters", "Its length defeats cracking hardware better than symbol-stuffing", "It's changed more frequently", "It's shorter and easier to type"], correctIndex: 1 }
      },
      {
        id: "l3",
        moduleId: "m2",
        title: "Password managers, in practice",
        body: "A password manager generates a unique, random password for every single account and fills it in for you — so reuse becomes physically impossible instead of just discouraged. If your organization provides one, use it for every account, personal accounts included; a breach of your personal email is often the first domino toward a work account breach through password-reset links.",
        keyTakeaway: "A password manager makes reuse physically impossible instead of just discouraged — use it everywhere, personal accounts included.",
        check: { question: "What does a password manager do that stops password reuse?", choices: ["It reminds you to reuse strong passwords", "It generates and stores a unique random password for every account", "It deletes old passwords automatically", "It only works for work accounts"], correctIndex: 1 }
      },
      {
        id: "l4",
        moduleId: "m2",
        title: "Multi-factor authentication (MFA)",
        body: "MFA means proving who you are with something beyond a password — a code from an app, a hardware key, a push notification. Even if an attacker steals your password, they're stopped cold without the second factor. An authenticator app or hardware key is meaningfully stronger than SMS codes, which can be intercepted through SIM-swapping — but any MFA is dramatically better than none. Turn it on everywhere it's offered, starting with email, since email is usually the master key to resetting everything else.",
        keyTakeaway: "Any MFA beats none, but an authenticator app or hardware key resists SIM-swapping in a way SMS codes can't.",
        check: { question: "Why is an authenticator app stronger than SMS codes for MFA?", choices: ["SMS codes cost money to receive", "SMS codes can be intercepted through SIM-swapping", "Authenticator apps work without a phone", "SMS codes never expire"], correctIndex: 1 }
      }
    ],
    quiz: [
      { id: "q1", questionType: "single", question: "What makes password reuse so dangerous?", choices: ["It's against most company policies", "One leaked password can unlock many of your accounts at once", "It makes passwords easier to guess character by character", "It slows down your login speed"], correctIndex: 1 },
      { id: "q2", questionType: "single", question: "What matters most for password strength?", choices: ["Using at least one special character", "Changing it every 30 days", "Length and uniqueness", "Including your birth year"], correctIndex: 2 },
      { id: "q3", questionType: "single", question: "Why turn on MFA even if you have a strong password?", choices: ["It's required for password managers to work", "It stops an attacker even if your password is stolen", "It makes your password expire less often", "It replaces the need for a password entirely"], correctIndex: 1 },
      { id: "q4", questionType: "single", question: "Which MFA method is generally weakest against a determined attacker?", choices: ["Hardware security key", "Authenticator app code", "SMS text message code", "Biometric (fingerprint/face)"], correctIndex: 2 }
    ]
  },
  {
    id: "local-social-engineering",
    slug: "social-engineering",
    title: "Social Engineering",
    description: "Phishing's cousins — impersonation calls, tailgating, and pretexting — and the habits that catch a manipulation attempt before it works.",
    level: "intermediate",
    estimatedMinutes: 15,
    category: "cybersecurity",
    freeTier: false,
    modules: [
      { id: "m1", title: "Manipulation Tactics" },
      { id: "m2", title: "Physical & Everyday Defense" }
    ],
    lessons: [
      {
        id: "l1",
        moduleId: "m1",
        title: "Pretexting and impersonation",
        body: "Pretexting is inventing a believable scenario to extract information or access: someone calling as \"IT support\" needing your password to \"fix an urgent issue,\" or a fake vendor invoice referencing a real project name they found on LinkedIn. The details make it convincing — attackers research their target first. The defense isn't suspicion of everyone; it's a fixed rule: legitimate IT, finance, or leadership will never ask you to bypass normal verification steps, no matter how urgent they sound.",
        keyTakeaway: "The fixed rule: legitimate IT, finance, or leadership never ask you to bypass normal verification steps.",
        check: { question: "What's the fixed rule this lesson recommends against pretexting?", choices: ["Never answer the phone from unknown numbers", "Legitimate IT/finance/leadership will never ask you to bypass normal verification steps", "Always ask for a callback number", "Report every phone call to security"], correctIndex: 1 }
      },
      {
        id: "l2",
        moduleId: "m1",
        title: "Vishing and smishing",
        body: "Vishing (voice phishing) and smishing (SMS phishing) move the same tricks to phone calls and texts, where people tend to be less guarded than with email. A call claiming to be your bank's fraud department, or a text about a \"missed delivery\" with a link — both are designed to create urgency in a channel with less scrutiny. Treat unexpected calls and texts asking for information or action with the same skepticism as email: hang up and call the organization back using a number you already know, not one they gave you.",
        keyTakeaway: "Treat an unexpected call or text with the same skepticism as email — hang up and call back on a number you already know.",
        check: { question: "You get an unexpected call from your \"bank's fraud department\" asking for login details. Best move?", choices: ["Provide the details since it's about fraud protection", "Hang up and call the bank back using a number you already know", "Ask them to text you instead", "Give them half the information"], correctIndex: 1 }
      },
      {
        id: "l3",
        moduleId: "m2",
        title: "Tailgating and physical social engineering",
        body: "Not every attack is digital. Tailgating is following an employee through a badge-locked door without swiping in yourself, relying on politeness — most people hold the door. A confident walk and a plausible reason (\"forgot my badge, running late\") gets further than you'd expect. The fix is a workplace norm, not paranoia: it's normal and expected to politely ask an unfamiliar person to badge in themselves, even if it feels awkward.",
        keyTakeaway: "It's normal and expected to ask an unfamiliar person to badge into a secured door themselves, even if it feels awkward.",
        check: { question: "What's the recommended workplace norm around tailgating?", choices: ["Never hold the door for anyone", "It's normal and expected to ask an unfamiliar person to badge in themselves", "Always assume visitors are safe", "Report tailgating only if a badge alarm sounds"], correctIndex: 1 }
      },
      {
        id: "l4",
        moduleId: "m2",
        title: "Building a verify-first habit at work",
        body: "The common thread across every social engineering tactic is manufactured urgency plus a request to skip a normal step. The single strongest defense across email, phone, and in-person: when something feels rushed or exceptions-required, pause and verify through an independent, known channel before acting — and know that reporting a suspicious attempt, even if you're not sure, is always the right call.",
        keyTakeaway: "Manufactured urgency plus a request to skip a normal step is the pattern behind nearly every social-engineering attempt.",
        check: { question: "What's the common thread across social engineering tactics, per this lesson?", choices: ["They always involve email", "Manufactured urgency plus a request to skip a normal step", "They only target new employees", "They require advanced hacking tools"], correctIndex: 1 }
      }
    ],
    quiz: [
      { id: "q1", questionType: "single", question: "What is pretexting?", choices: ["A type of firewall configuration", "Inventing a believable scenario to extract information or access", "A password complexity rule", "An automated phishing filter"], correctIndex: 1 },
      { id: "q2", questionType: "single", question: "You get an unexpected call from \"your bank's fraud department\" asking to confirm your login details. Best move?", choices: ["Give the details since it's about fraud protection", "Hang up and call the bank back on a number you already know", "Ask them to email you instead", "Give partial information only"], correctIndex: 1 },
      { id: "q3", questionType: "single", question: "What is tailgating in a security context?", choices: ["Speeding in a company vehicle", "Following someone through a secured door without badging in", "Sending rapid-fire phishing emails", "Monitoring network traffic"], correctIndex: 1 },
      { id: "q4", questionType: "single", question: "The common thread across most social engineering attacks is:", choices: ["Poor grammar in the message", "Manufactured urgency plus a request to skip a normal step", "Attacks only happen over email", "They only target senior executives"], correctIndex: 1 }
    ]
  },
  {
    id: "local-malware-ransomware",
    slug: "malware-ransomware",
    title: "Malware & Ransomware",
    description: "How viruses, trojans, and ransomware actually get in, what makes ransomware uniquely dangerous, and the habits that stop an infection from spreading.",
    level: "intermediate",
    estimatedMinutes: 14,
    category: "endpoint-security",
    freeTier: false,
    modules: [
      { id: "m1", title: "How Malware Operates" },
      { id: "m2", title: "Ransomware & Response" }
    ],
    lessons: [
      {
        id: "l1",
        moduleId: "m1",
        title: "Malware, in plain terms",
        body: "Malware is any software built to damage, spy on, or take control of a system without permission — the umbrella term covering viruses, worms, trojans, spyware, and ransomware. A virus attaches itself to a legitimate file and spreads when that file is shared or run. A worm spreads on its own across a network with no user action needed. A trojan disguises itself as something useful — a \"free\" tool, a cracked application, an invoice attachment — to trick you into installing it yourself. Different mechanisms, same goal: get code running on a machine it doesn't belong on.",
        keyTakeaway: "Viruses, worms, and trojans differ in how they spread, but every kind of malware shares the same goal: unauthorized control.",
        check: { question: "What's the key difference between a worm and a trojan?", choices: ["A worm spreads on its own; a trojan tricks you into installing it", "A trojan is always more destructive", "A worm only affects mobile devices", "There is no meaningful difference"], correctIndex: 0 }
      },
      {
        id: "l2",
        moduleId: "m1",
        title: "How it actually gets in",
        body: "The overwhelming majority of malware infections start with a person, not a technical exploit: an email attachment opened, a link to a fake software download, a USB drive plugged in out of curiosity, or a legitimate-looking browser update prompt that isn't real. Outdated software is the second major door — unpatched operating systems and applications have known holes that malware is built specifically to walk through. Keeping software updated and thinking twice before opening an unexpected attachment closes both doors at once.",
        keyTakeaway: "Most infections start with a person, not an exploit — an unexpected attachment or an unpatched app are the two doors that matter most.",
        check: { question: "What are the two most common doors malware uses to get in?", choices: ["Weak Wi-Fi and old hardware", "Human action (attachments/links) and outdated, unpatched software", "Malware only spreads via USB", "It always requires a targeted hacker"], correctIndex: 1 }
      },
      {
        id: "l3",
        moduleId: "m2",
        title: "Why ransomware is different",
        body: "Ransomware encrypts your files — and often every file it can reach on connected network drives — then demands payment for the decryption key. It's uniquely dangerous because it doesn't quietly steal data in the background; it stops a business cold, often across every department at once, within minutes of detonating. Paying the ransom is never guaranteed to restore your files and directly funds the next attack. The only reliable defense is prevention plus real, tested backups kept disconnected from the network — a ransomware infection that hits a current, isolated backup is a bad afternoon; one that doesn't is a company-ending event.",
        keyTakeaway: "The only reliable defense is prevention plus tested backups kept disconnected from the network — paying rarely guarantees recovery.",
        check: { question: "What's described as the only reliable defense against ransomware?", choices: ["Paying quickly to minimize damage", "Prevention plus real, tested backups kept disconnected from the network", "Using a stronger antivirus alone", "Ignoring the ransom note"], correctIndex: 1 }
      },
      {
        id: "l4",
        moduleId: "m2",
        title: "If you suspect an infection",
        body: "Disconnect the device from the network immediately — unplug the cable or turn off Wi-Fi — to stop it from spreading to shared drives or other machines before you do anything else. Don't restart the computer; some malware activates further damage on reboot, and a live memory dump can help investigators understand what happened. Report it to IT/security right away, even if you're not certain — the earlier containment starts, the smaller the damage. As with phishing, speed and honesty beat trying to quietly fix it yourself.",
        keyTakeaway: "Disconnect first, don't reboot, and report it immediately — a live memory dump can matter more than a quick fix.",
        check: { question: "What should you NOT do if you suspect a ransomware infection?", choices: ["Disconnect from the network", "Report it to IT/security", "Restart the computer right away", "Act quickly"], correctIndex: 2 }
      }
    ],
    quiz: [
      { id: "q1", questionType: "single", question: "What's the key difference between a worm and a trojan?", choices: ["A worm spreads on its own; a trojan tricks you into installing it", "A trojan is always more destructive", "A worm only affects mobile devices", "There is no meaningful difference"], correctIndex: 0 },
      { id: "q2", questionType: "single", question: "What are the two most common ways malware actually gets onto a system?", choices: ["Weak Wi-Fi passwords and old hardware", "Human action (attachments/links/downloads) and outdated, unpatched software", "Malware only spreads through physical USB drives", "It requires a targeted hacker, not routine behavior"], correctIndex: 1 },
      { id: "q3", questionType: "single", question: "Why is ransomware considered uniquely dangerous compared to other malware?", choices: ["It only targets large enterprises", "It quietly steals data without anyone noticing", "It can halt an entire organization within minutes and paying doesn't guarantee recovery", "It's the easiest malware type to remove"], correctIndex: 2 },
      { id: "q4", questionType: "single", question: "You suspect your computer is infected with ransomware. First move?", choices: ["Restart the computer to clear it", "Disconnect from the network immediately and report it", "Wait to see if it spreads further before acting", "Try to pay the ransom quickly to minimize downtime"], correctIndex: 1 }
    ]
  },
  {
    id: "local-data-handling",
    slug: "data-handling-privacy",
    title: "Data Handling & Privacy",
    description: "How to classify, share, and store sensitive data safely — and what to do the moment you suspect something's gone wrong.",
    level: "intermediate",
    estimatedMinutes: 12,
    category: "data-protection",
    freeTier: false,
    modules: [
      { id: "m1", title: "Handling Data Safely" },
      { id: "m2", title: "Staying Safe & Reporting" }
    ],
    lessons: [
      {
        id: "l1",
        moduleId: "m1",
        title: "Classifying sensitive data",
        body: "Not all data carries the same risk. Customer PII (names, emails, payment details), credentials, and internal financial data need the most care; general internal docs need some care; public marketing material needs none. When you're not sure how sensitive something is, treat it as sensitive by default and ask — the cost of an unnecessary precaution is minutes; the cost of a real leak is measured in trust and, often, regulatory fines.",
        keyTakeaway: "When you're not sure how sensitive something is, treat it as sensitive by default — the cost of caution is minutes, not trust.",
        check: { question: "What should you do when you're unsure how sensitive a piece of data is?", choices: ["Assume it's not sensitive to save time", "Treat it as sensitive by default and ask", "Only worry about it if it contains a password", "Ignore it until someone complains"], correctIndex: 1 }
      },
      {
        id: "l2",
        moduleId: "m1",
        title: "Safe sharing and storage",
        body: "Share sensitive files through your organization's approved tools — not personal email or personal cloud storage, which fall outside company security controls entirely. Before sharing a link, double-check the permissions: \"anyone with the link\" often means anyone on the internet who ever sees that link, forwarded or not. Set expiration dates on shared links where possible, and remove access once a project wraps up rather than leaving it open indefinitely.",
        keyTakeaway: "\"Anyone with the link\" usually means anyone the link is ever forwarded to, not just its first recipient.",
        check: { question: "What's the risk with \"anyone with the link\" sharing settings?", choices: ["The file becomes read-only", "The link can end up accessible to anyone it's forwarded to", "Files expire automatically", "It only works inside the company network"], correctIndex: 1 }
      },
      {
        id: "l3",
        moduleId: "m2",
        title: "Working remotely and securely",
        body: "Public Wi-Fi at a cafe or airport is not inherently unsafe with modern encrypted sites (https), but avoid sensitive work on networks you don't control without your company's VPN if one is provided. Lock your screen every time you step away, even for a minute — in an office or in public. Never let sensitive data live only on a personal device; if you wouldn't want it on the news, it shouldn't be sitting in your personal Downloads folder.",
        keyTakeaway: "Use your company VPN for sensitive work on networks you don't control, and never let sensitive data live only on a personal device.",
        check: { question: "What does this lesson recommend for sensitive work on public Wi-Fi?", choices: ["Any https site is automatically safe, no precautions needed", "Avoid sensitive work unless using your company's VPN", "Public Wi-Fi is always completely safe", "Only avoid it on weekends"], correctIndex: 1 }
      },
      {
        id: "l4",
        moduleId: "m2",
        title: "Reporting a suspected breach",
        body: "If you send sensitive data to the wrong person, lose a device, or notice data somewhere it shouldn't be, report it immediately — even if you're not fully sure it's a real problem. Every hour matters for containment, and organizations plan for mistakes; what they can't plan for is not knowing. Nobody gets in trouble for reporting a real mistake quickly. The trouble comes from staying quiet and hoping no one notices.",
        keyTakeaway: "Report a real mistake immediately, even without full certainty — the trouble comes from staying quiet, not from reporting.",
        check: { question: "What does this lesson say about reporting a mistake, like emailing sensitive data to the wrong person?", choices: ["Wait to see if anyone notices", "Report it immediately, even without full certainty of impact", "Only report if it contained passwords", "Try to quietly recall the email and say nothing else"], correctIndex: 1 }
      }
    ],
    quiz: [
      { id: "q1", questionType: "single", question: "When you're unsure how sensitive a piece of data is, you should:", choices: ["Assume it's not sensitive to save time", "Treat it as sensitive by default and ask", "Only worry about it if it contains a password", "Check with a coworker informally, no need to escalate"], correctIndex: 1 },
      { id: "q2", questionType: "single", question: "What's the risk with \"anyone with the link\" sharing settings?", choices: ["The file becomes read-only", "The link can end up accessible to anyone it's forwarded to", "It automatically expires after a week", "It only works within your company's network"], correctIndex: 1 },
      { id: "q3", questionType: "single", question: "On public Wi-Fi, the safest approach for sensitive work is:", choices: ["Any https site is automatically fine, no precautions needed", "Avoid sensitive work unless using your company's VPN", "Public Wi-Fi is never safe for any browsing", "Only avoid it if using a work laptop"], correctIndex: 1 },
      { id: "q4", questionType: "single", question: "You accidentally email a sensitive file to the wrong person. Best move?", choices: ["Wait to see if they notice or respond", "Report it immediately, even without full certainty of impact", "Only report if the file contained passwords", "Quietly try to recall the email and say nothing else"], correctIndex: 1 }
    ]
  },
  {
    id: "local-mobile-device-security",
    slug: "mobile-device-security",
    title: "Mobile & Device Security",
    description: "Lock screens, app permissions, and public charging risks — the everyday habits that keep a phone or laptop safe when it's lost, stolen, or just out in public.",
    level: "beginner",
    estimatedMinutes: 13,
    category: "endpoint-security",
    freeTier: false,
    modules: [
      { id: "m1", title: "Everyday Device Habits" },
      { id: "m2", title: "Staying Safe On the Go" }
    ],
    lessons: [
      {
        id: "l1",
        moduleId: "m1",
        title: "Lock screens and lost devices",
        body: "A phone or laptop without a lock screen is an open book to anyone who finds it — email, banking apps, saved passwords, and every account you're logged into. Enable a PIN, password, or biometric lock on every device, and set the auto-lock timeout as short as you can tolerate (30 seconds to 1 minute for a phone). Also enroll every device in Find My iPhone, Find My Device, or your company's mobile device management — the ability to remotely locate, lock, or wipe a device is what actually limits the damage once it's gone.",
        keyTakeaway: "A short auto-lock timeout plus remote-wipe enrollment is the single biggest protection against a lost or stolen device.",
        check: { question: "What's the single most effective protection against a lost or stolen device?", choices: ["A strong email password alone", "A lock screen with a short auto-lock timeout, plus remote-wipe enrollment", "Keeping the device turned off when not in use", "Using a screen protector"], correctIndex: 1 }
      },
      {
        id: "l2",
        moduleId: "m1",
        title: "App permissions you should question",
        body: "Apps routinely ask for more access than they need — a flashlight app requesting your contacts, a game requesting your microphone. Review app permissions periodically (in your phone's Settings, not just when first installing) and revoke anything that doesn't make sense for what the app actually does. Only install apps from official app stores; sideloading apps from outside them skips the security review those stores perform and is one of the most common ways malicious apps end up on a device.",
        keyTakeaway: "Review and revoke app permissions that don't match what the app actually needs to do — and stick to official app stores.",
        check: { question: "What's the safest habit around app permissions?", choices: ["Grant everything an app asks for so it works properly", "Review and revoke permissions an app doesn't actually need for its function", "Only worry about permissions for banking apps", "Permissions don't matter if the app has good reviews"], correctIndex: 1 }
      },
      {
        id: "l3",
        moduleId: "m2",
        title: "Public Wi-Fi, public chargers, and public USB ports",
        body: "\"Juice jacking\" is real: a compromised public USB charging port (at an airport, cafe, or hotel) can be used to install malware or steal data the moment a phone is plugged in, because USB carries data as well as power. Carry your own charger and cable, or a portable battery pack, instead of plugging into a public port. Public Wi-Fi itself isn't automatically dangerous for browsing encrypted (https) sites, but avoid logging into sensitive accounts on it without your company's VPN — an attacker on the same network can potentially see unencrypted traffic.",
        keyTakeaway: "Bring your own charger or a battery pack instead of using public USB charging ports — USB carries data, not just power.",
        check: { question: "What's the safest way to charge your phone in a public place like an airport?", choices: ["Any public USB port is fine as long as it's from a reputable location", "Use your own charger and cable, or a portable battery pack", "Public charging ports are always safe for phones, only laptops are at risk", "Ask a stranger to borrow their charger instead"], correctIndex: 1 }
      },
      {
        id: "l4",
        moduleId: "m2",
        title: "If your device is lost or stolen",
        body: "Act immediately, not after a day of hoping it turns up. Use Find My Device (or your company's mobile device management) to remotely locate, lock, or wipe it. Change the password for any account you were logged into on that device, starting with email, since it can reset everything else. Report a lost or stolen work device to IT/security right away — the faster it's reported, the sooner access to company systems can be revoked from that device specifically.",
        keyTakeaway: "Remotely lock or wipe the device first, then change passwords for anything you were logged into, and report it to IT immediately.",
        check: { question: "What should you do first if a work phone is lost or stolen?", choices: ["Wait 24 hours in case it's found", "Remotely lock or wipe it, then report it to IT/security immediately", "Only worry about it if it had banking apps installed", "Buy a replacement before reporting it"], correctIndex: 1 }
      }
    ],
    quiz: [
      { id: "q1", questionType: "single", question: "What's the single most effective protection against a lost or stolen device?", choices: ["A strong email password alone", "A lock screen with a short auto-lock timeout", "Keeping the device turned off", "A screen protector"], correctIndex: 1 },
      { id: "q2", questionType: "single", question: "Why should you review an app's permissions periodically?", choices: ["Apps often request more access than they actually need", "It's required by app stores", "It makes the app run faster", "It's only necessary for banking apps"], correctIndex: 0 },
      { id: "q3", questionType: "single", question: "What is \"juice jacking\"?", choices: ["A phone battery defect", "Using a compromised public USB charging port to install malware or steal data", "A type of phishing email", "An app permission setting"], correctIndex: 1 },
      { id: "q4", questionType: "single", question: "Your work phone is stolen. What's the right first move?", choices: ["Wait to see if it's returned", "Remotely lock or wipe it, then report it to IT immediately", "Post about it on social media", "Change your email password only after a week"], correctIndex: 1 }
    ]
  },
  {
    id: "local-physical-security",
    slug: "physical-security-workplace-awareness",
    title: "Physical Security & Workplace Awareness",
    description: "Clean desks, badge discipline, shoulder surfing, and secure disposal — the physical-world habits that protect information no firewall ever touches.",
    level: "beginner",
    estimatedMinutes: 11,
    category: "physical-security",
    freeTier: false,
    modules: [
      { id: "m1", title: "Workspace Habits" },
      { id: "m2", title: "Awareness & Disposal" }
    ],
    lessons: [
      {
        id: "l1",
        moduleId: "m1",
        title: "Clean desk, locked screen",
        body: "Sensitive printouts, sticky notes with passwords, and an unlocked computer left unattended are a real risk even inside a supposedly safe office — cleaners, contractors, delivery people, and other visitors pass through spaces employees assume are private. Lock your screen every time you step away, even for a minute (Windows+L, or Control+Command+Q on a Mac) — it becomes automatic within a week of doing it deliberately. Put sensitive documents away, not face-up on a desk, when you're not actively using them.",
        keyTakeaway: "Lock your screen every time you step away, even for a minute — it becomes automatic once you do it deliberately for a few days.",
        check: { question: "When should you lock your computer screen when stepping away from your desk?", choices: ["Only if you'll be gone more than 30 minutes", "Every time, even for a minute", "Only in shared or public workspaces", "Only if sensitive documents are visible"], correctIndex: 1 }
      },
      {
        id: "l2",
        moduleId: "m1",
        title: "Visitors, badges, and access",
        body: "Wear your badge visibly and never lend it to anyone, even a coworker who forgot theirs — badge access is tied to you personally, and \"just this once\" is exactly how tailgating and unauthorized access attempts succeed. Escort visitors rather than letting them wander a secured area alone, and it's normal and expected to politely stop someone without a visible badge and ask who they're visiting, even if that feels awkward the first time.",
        keyTakeaway: "Never lend your badge to anyone, even a coworker — access is tied to you personally, not to \"just this once.\"",
        check: { question: "A coworker forgot their badge and asks to borrow yours for the day. Best response?", choices: ["Lend it, since you trust them", "Decline and direct them to reception or security to get a temporary badge", "Let them follow you through doors all day instead", "Only lend it if they're on your team"], correctIndex: 1 }
      },
      {
        id: "l3",
        moduleId: "m2",
        title: "Shoulder surfing and public spaces",
        body: "Working from a cafe, train, or shared coworking space means anyone nearby can potentially see your screen — this is called shoulder surfing, and it's a low-effort way to catch a glimpse of a password, an email, or confidential figures. Use a privacy screen filter for sensitive work in public, position your screen away from foot traffic where possible, and avoid discussing confidential information aloud in public spaces, including on phone calls.",
        keyTakeaway: "Anyone nearby can potentially see your screen in a public space — position it away from foot traffic and use a privacy filter for sensitive work.",
        check: { question: "What is \"shoulder surfing\"?", choices: ["A type of phishing email", "Someone nearby visually observing your screen to catch sensitive information", "A malware infection method", "An unlocked-screen policy violation"], correctIndex: 1 }
      },
      {
        id: "l4",
        moduleId: "m2",
        title: "Disposing of sensitive material safely",
        body: "\"Delete\" is not the same as \"destroyed.\" Shred physical documents containing sensitive information rather than putting them in regular trash or recycling — a shredder bin, not a wastebasket. For old computers, phones, or drives, use your organization's secure disposal or data-wiping process rather than simply throwing hardware away; deleted files on a drive that's discarded intact can often still be recovered by anyone who finds it.",
        keyTakeaway: "Shred sensitive paper documents and use your organization's secure wipe/disposal process for old hardware — deleting files isn't the same as destroying them.",
        check: { question: "Why isn't throwing an old laptop in the trash a safe way to dispose of it?", choices: ["It's bad for the environment only", "Deleted files can often still be recovered from an intact drive", "It voids the warranty", "It's only a risk for company-owned devices"], correctIndex: 1 }
      }
    ],
    quiz: [
      { id: "q1", questionType: "single", question: "When should you lock your screen when stepping away from your desk?", choices: ["Only for long breaks", "Every time, even briefly", "Only outside the office", "Only if others are nearby"], correctIndex: 1 },
      { id: "q2", questionType: "single", question: "A coworker without their badge asks to follow you through a secured door. Best practice?", choices: ["Let them in since you recognize them", "It's normal and expected to ask them to badge in themselves or go through reception", "Only let them in if they're senior to you", "Report it only if they seem suspicious"], correctIndex: 1 },
      { id: "q3", questionType: "single", question: "What's the best defense against shoulder surfing in a public space?", choices: ["Working faster so less is visible", "A privacy screen filter and positioning your screen away from foot traffic", "Only checking email in public", "It's not a real risk outside the office"], correctIndex: 1 },
      { id: "q4", questionType: "single", question: "What's the safest way to dispose of an old company laptop?", choices: ["Throw it in the regular trash", "Use your organization's secure wipe/disposal process", "Give it away after deleting a few files", "Remove the sticker with the company logo only"], correctIndex: 1 }
    ]
  },
  {
    id: "local-soc-fundamentals",
    slug: "soc-fundamentals",
    title: "SOC Fundamentals: Detecting & Responding to Threats",
    description: "How a Security Operations Center actually works — the analyst tiers, triaging alerts under real time pressure, and the incident response lifecycle every SOC follows.",
    level: "intermediate",
    estimatedMinutes: 20,
    category: "soc",
    freeTier: false,
    modules: [
      { id: "m1", title: "How a SOC Operates" },
      { id: "m2", title: "Triage & Response" }
    ],
    lessons: [
      {
        id: "l1",
        moduleId: "m1",
        title: "What a SOC actually does",
        body: "A Security Operations Center is the team and the workflow that watches an organization's systems around the clock and decides, for every alert that fires, whether it's noise or a real problem. The raw material is telemetry — logs from firewalls, endpoints, servers, cloud services, and identity systems — pulled into a SIEM (Security Information and Event Management platform) that correlates it and flags anything that matches a known bad pattern. A SOC's real output isn't \"alerts reviewed\"; it's incidents caught early enough that they were cheap to fix instead of a breach that made the news. Most of a SOC's day is spent proving that an alert is nothing — which is exactly the point, since the one time it isn't nothing is the one that matters.",
        keyTakeaway: "A SOC's real job is deciding which of thousands of alerts is the one that actually matters — most of the work is proving something is nothing.",
        check: { question: "What is the main output a SOC is actually judged on?", choices: ["The total number of alerts generated", "Incidents caught early, before they become expensive breaches", "How many logs are collected per day", "The number of firewalls installed"], correctIndex: 1 }
      },
      {
        id: "l2",
        moduleId: "m1",
        title: "Analyst tiers and when to escalate",
        body: "Most SOCs split work across tiers so the right level of experience handles the right level of problem. Tier 1 analysts triage the incoming stream: is this alert a known false positive, or does it need a closer look? They handle volume, not depth. Tier 2 analysts investigate what Tier 1 escalates — pulling additional logs, confirming whether something malicious actually happened, and scoping how far it spread. Tier 3 (sometimes called threat hunters or incident responders) handle the serious cases: active intrusions, novel attack techniques nothing already caught, and leading the response when containment is required. The tiers exist so a Tier 1 analyst isn't expected to make a containment call alone, and a Tier 3 responder isn't stuck triaging routine noise instead of hunting for what the automated tools missed.",
        keyTakeaway: "Tiers exist so triage volume and deep investigation are handled by the right level of experience — escalate rather than guess.",
        check: { question: "What is a Tier 1 SOC analyst primarily responsible for?", choices: ["Leading incident containment during a breach", "Triaging the incoming alert stream and deciding what needs escalation", "Writing detection rules for the SIEM", "Managing the organization's firewall hardware"], correctIndex: 1 }
      },
      {
        id: "l3",
        moduleId: "m2",
        title: "Reading and prioritizing alerts",
        body: "Not every alert deserves the same urgency, and treating them all equally is how real threats get buried under noise. A useful first question for any alert: what asset is involved, and how sensitive is it? An alert on a developer's test laptop and the same alert on a domain controller are not the same incident. The second question is context — has this exact alert fired before and turned out to be nothing, or is it new? A SIEM assigns a severity score, but that score is a starting point, not the final answer; an experienced analyst still checks whether the surrounding activity makes the alert more or less believable before deciding how fast to act.",
        keyTakeaway: "Prioritize by asset sensitivity and context, not just the SIEM's severity score alone — the same alert means different things on different systems.",
        check: { question: "Why shouldn't an analyst treat every alert with the same urgency?", choices: ["Because most alerts are automatically correct", "Because the same alert can mean very different things depending on which asset it involves", "Because low-severity alerts should always be ignored", "Because the SIEM's severity score is always final"], correctIndex: 1 }
      },
      {
        id: "l4",
        moduleId: "m2",
        title: "The incident response lifecycle",
        body: "Once an alert is confirmed as a real incident, response follows a repeatable sequence rather than improvisation: identify what's actually happening and how far it's spread, contain it to stop it from getting worse (isolating a device from the network is often the fastest first move), eradicate the actual cause (a malicious process, a compromised account, a vulnerable service), recover affected systems back to normal operation, and finally document what happened in a post-incident review. That last step is not paperwork for its own sake — it's how a SOC gets better after every real incident, feeding back into what the SIEM watches for next time.",
        keyTakeaway: "Identify, contain, eradicate, recover, then review — skipping the review step means the SOC never gets better at catching the next one.",
        check: { question: "What is the purpose of the post-incident review at the end of the response lifecycle?", choices: ["It's a formality required for compliance only", "It feeds back into what the SOC watches for and improves the response next time", "It replaces the need for containment", "It's only done if the incident became public"], correctIndex: 1 }
      }
    ],
    quiz: [
      { id: "q1", questionType: "single", question: "What is a SIEM primarily used for in a SOC?", choices: ["Physically securing server rooms", "Correlating logs and telemetry to flag activity that matches known bad patterns", "Managing employee passwords", "Running the organization's public website"], correctIndex: 1 },
      { id: "q2", questionType: "single", question: "A Tier 1 analyst finds an alert that looks like it could be a real intrusion, beyond routine triage. What should they do?", choices: ["Handle containment themselves immediately", "Escalate it to Tier 2/3 rather than guessing at the response", "Close the alert as a false positive to keep the queue moving", "Wait until their next shift to look at it again"], correctIndex: 1 },
      { id: "q3", questionType: "single", question: "The same alert fires on a test laptop and on a domain controller. How should an analyst treat these two events?", choices: ["Identically — the alert type is what matters", "Differently — the sensitivity of the affected asset changes the priority", "The domain controller alert should always be ignored as noise", "Only the test laptop alert needs investigation"], correctIndex: 1 },
      { id: "q4", questionType: "single", question: "What is usually the fastest first containment move when a device is confirmed compromised?", choices: ["Reinstalling the operating system immediately", "Isolating the device from the network", "Rebooting the device and monitoring it", "Notifying customers before anything else"], correctIndex: 1 },
      { id: "q5", questionType: "ordering", question: "Arrange the incident response lifecycle in the correct order:", choices: ["Recover affected systems", "Contain the incident", "Identify what's happening", "Post-incident review", "Eradicate the root cause"], correctOrder: [2, 1, 4, 0, 3] },
      { id: "q6", questionType: "multiple", question: "Select every factor that should influence how an analyst prioritizes an alert (choose all that apply):", choices: ["The sensitivity of the asset involved", "Whether this exact alert has fired before and turned out to be nothing", "The SIEM's raw severity score alone, with nothing else considered", "The surrounding context and activity around the alert"], correctIndexes: [0, 1, 3] }
    ]
  }
];

// Categories that actually have at least one course — the library filter
// only ever shows chips with real courses behind them, never an empty one.
export const CATEGORY_LABELS = {
  "email-security": "Email Security",
  "identity": "Identity",
  "cybersecurity": "Cybersecurity",
  "endpoint-security": "Endpoint Security",
  "data-protection": "Data Protection",
  "physical-security": "Physical Security",
  "soc": "Security Operations"
};

// Public catalog shape — matches fetchCybersachetCourses() exactly.
export function getLocalCourses() {
  return COURSES.map(c => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    level: c.level,
    estimatedMinutes: c.estimatedMinutes,
    category: c.category,
    freeTier: c.freeTier,
    lessonCount: c.lessons.length,
    quizQuestionCount: c.quiz.length
  }));
}
export function getLocalModules(courseId) {
  const course = COURSES.find(c => c.id === courseId);
  return (course?.modules ?? []).map(m => ({ id: m.id, title: m.title }));
}
export function getLocalLessons(courseId) {
  const course = COURSES.find(c => c.id === courseId);
  return (course?.lessons ?? []).map((l, i) => ({
    id: l.id,
    moduleId: l.moduleId ?? null,
    title: l.title,
    body: l.body,
    keyTakeaway: l.keyTakeaway ?? null,
    sortOrder: i,
    check: l.check ? { question: l.check.question, choices: l.check.choices } : null
  }));
}
// Strips every correct-answer field before handing questions to the UI,
// same boundary the real list_course_quiz() RPC enforces server-side —
// scoring stays inside this module, mirroring submitCourseQuiz() scoring
// server-side for real accounts.
export function getLocalQuiz(courseId) {
  const course = COURSES.find(c => c.id === courseId);
  return (course?.quiz ?? []).map((q, i) => ({ id: q.id, question: q.question, choices: q.choices, questionType: q.questionType, sortOrder: i }));
}

// Namespaced per user id, not one global key — local preview is a
// device-local simulation of a real per-user record, and a device can be
// shared by more than one account (a shared browser, a shared test
// machine). Without this, switching accounts in the same browser would
// show one account's "progress" and badges under a completely different
// account, which is exactly the kind of cross-account bleed a real,
// per-user-scoped backend would never produce.
function storageKey(userId) {
  return `cybersachet-local-progress:${userId ?? "anon"}`;
}
function readState(userId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId))) ?? {};
  } catch {
    return {};
  }
}
function writeState(userId, state) {
  localStorage.setItem(storageKey(userId), JSON.stringify(state));
}
function courseState(state, courseId) {
  return state[courseId] ?? { enrolledAt: null, completedLessonIds: [], completedAt: null, quizScore: null };
}
function recordActivity(state) {
  const today = new Date().toISOString().slice(0, 10);
  const dates = new Set(state.activityDates ?? []);
  dates.add(today);
  state.activityDates = [...dates].sort();
}

export function getLocalEnrollments(userId) {
  const state = readState(userId);
  return getLocalCourses().filter(c => state[c.id]?.enrolledAt).map(c => {
    const cs = courseState(state, c.id);
    return {
      enrollmentId: c.id,
      courseId: c.id,
      courseTitle: c.title,
      courseSlug: c.slug,
      level: c.level,
      estimatedMinutes: c.estimatedMinutes,
      enrolledAt: cs.enrolledAt,
      completedAt: cs.completedAt,
      quizScore: cs.quizScore,
      lessonCount: c.lessonCount,
      completedLessonCount: cs.completedLessonIds.length
    };
  });
}
export async function localEnroll(courseId, userId) {
  const state = readState(userId);
  state[courseId] = { ...courseState(state, courseId), enrolledAt: new Date().toISOString() };
  writeState(userId, state);
}
export async function localGetLessonProgress(courseId, userId) {
  const state = readState(userId);
  return new Set(courseState(state, courseId).completedLessonIds);
}
// Replaces the old self-report "mark complete": verifies the chosen answer
// against the real correct index server-side (well — inside this module,
// which plays the role the server would in the live version) and only
// records progress if it's right.
export async function localCheckLessonAnswer(courseId, lessonId, choiceIndex, userId) {
  const course = COURSES.find(c => c.id === courseId);
  const lesson = course?.lessons.find(l => l.id === lessonId);
  const correct = lesson?.check ? choiceIndex === lesson.check.correctIndex : true;
  if (correct) {
    const state = readState(userId);
    const cs = courseState(state, courseId);
    if (!cs.completedLessonIds.includes(lessonId)) cs.completedLessonIds.push(lessonId);
    if (!cs.enrolledAt) cs.enrolledAt = new Date().toISOString();
    state[courseId] = cs;
    recordActivity(state);
    writeState(userId, state);
  }
  return correct;
}
// Grades all three question types with the same semantics as the real
// submit_quiz() RPC: single compares an index, multiple compares the
// chosen indexes as a set (order doesn't matter), ordering compares the
// submitted sequence exactly (order is the whole point).
function gradeAnswer(question, given) {
  if (question.questionType === "multiple") {
    const a = [...(given ?? [])].sort((x, y) => x - y);
    const b = [...question.correctIndexes].sort((x, y) => x - y);
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  if (question.questionType === "ordering") {
    const a = given ?? [];
    const b = question.correctOrder;
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return given === question.correctIndex;
}
export async function localSubmitQuiz(courseId, answers, userId) {
  const course = COURSES.find(c => c.id === courseId);
  const total = course.quiz.length;
  const correct = course.quiz.filter(q => gradeAnswer(q, answers[q.id])).length;
  const score = Math.round((correct / total) * 100);
  const state = readState(userId);
  const cs = courseState(state, courseId);
  cs.quizScore = score;
  if (score >= 70) cs.completedAt = new Date().toISOString();
  state[courseId] = cs;
  recordActivity(state);
  writeState(userId, state);
  return score;
}

// Local dashboard stats — the same shape my_cybersachet_stats() returns,
// computed from this device's own localStorage progress. Streak is real
// consecutive-day activity tracked in `activityDates` above, not a
// placeholder counter. There's no local leaderboard: a leaderboard ranks
// people against each other, and local preview mode is a solo, one-device
// demo with nobody else to rank against — showing one wouldn't be real.
export function getLocalStats(userId) {
  const state = readState(userId);
  const enrollments = getLocalEnrollments(userId);
  const completed = enrollments.filter(e => e.completedAt);
  const inProgress = enrollments.filter(e => !e.completedAt && e.enrolledAt);
  const avgScore = completed.length > 0 ? Math.round(completed.reduce((sum, e) => sum + (e.quizScore ?? 0), 0) / completed.length) : null;
  const hoursTrained = Math.round((completed.reduce((sum, e) => sum + e.estimatedMinutes, 0) / 60) * 10) / 10;

  const dates = (state.activityDates ?? []).slice().sort().reverse();
  let streak = 0;
  if (dates.length > 0) {
    const today = new Date();
    let cursor = new Date(today.toISOString().slice(0, 10));
    const hasToday = dates[0] === cursor.toISOString().slice(0, 10);
    if (!hasToday) cursor.setDate(cursor.getDate() - 1);
    for (const d of dates) {
      if (d === cursor.toISOString().slice(0, 10)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
  }

  const published = COURSES.length;
  const hasPerfect = enrollments.some(e => e.quizScore === 100);
  const completionist = published > 0 && completed.length >= published;
  const badges = [];
  if (completed.length >= 1) badges.push("first_course");
  if (hasPerfect) badges.push("perfect_score");
  if (completionist) badges.push("completionist");
  if (streak >= 3) badges.push("streak_3");
  if (streak >= 7) badges.push("streak_7");

  return {
    completedCourses: completed.length,
    inProgressCourses: inProgress.length,
    avgScore,
    hoursTrained,
    streakDays: streak,
    badges
  };
}
