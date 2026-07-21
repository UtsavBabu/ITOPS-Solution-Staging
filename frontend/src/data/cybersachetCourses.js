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
  },
  // The one Moonsav ITOps Academy (Cloud/DevOps/Infrastructure) course
  // mirrored into local preview — same real content as the seeded
  // 'linux-fundamentals-for-it-operations' course in migration 0073, so an
  // unlicensed prospect touring the product actually sees Academy exists,
  // not just CyberSachet's security courses. Everything else in Academy
  // (Cloud Computing Essentials, DevOps & CI/CD) only exists as real DB
  // content today — adding a full second/third local course is real content
  // authoring, not a quick follow-up, so this one is the honest preview.
  {
    id: "local-linux-fundamentals",
    slug: "linux-fundamentals-for-it-operations",
    title: "Linux Fundamentals for IT Operations",
    description: "The commands and concepts you actually use running Linux servers day to day — the filesystem layout, permissions, processes, and package management every other Academy course builds on.",
    level: "beginner",
    estimatedMinutes: 20,
    category: "infrastructure",
    track: "academy",
    freeTier: true,
    modules: [
      { id: "m1", title: "Finding Your Way Around" },
      { id: "m2", title: "Permissions, Processes & Packages" }
    ],
    lessons: [
      {
        id: "l1",
        moduleId: "m1",
        title: "The filesystem layout",
        body: "Every Linux system is organized under a single root directory, / — there's no separate drive letter per disk the way Windows uses C:\\ and D:\\. A few directories matter most day to day: /etc holds system-wide configuration files, /var holds data that changes over time (most importantly /var/log, where nearly every service writes its logs), /home holds each user's personal files, and /tmp is scratch space that's often cleared on reboot. When something breaks, /var/log is usually the first place to look, and when you need to change how a service behaves, /etc is usually where its config file lives.",
        keyTakeaway: "When troubleshooting, check /var/log first for what happened and /etc for how a service is configured.",
        check: { question: "Where would you look first to find out why a service crashed?", choices: ["/home", "/var/log", "/tmp", "/etc"], correctIndex: 1 }
      },
      {
        id: "l2",
        moduleId: "m1",
        title: "Navigating and reading files from the shell",
        body: "pwd prints your current directory, ls -la lists everything in it including hidden files (anything starting with a dot) with permissions and sizes, and cd changes directory — cd .. goes up one level, cd ~ goes home. To read a file without opening an editor, cat dumps the whole thing to the screen (fine for short files), less lets you scroll through a long one a page at a time, and tail -f /var/log/some.log follows a log file live as new lines are written — the single most-used command when watching a service start up or debugging something happening right now.",
        keyTakeaway: "tail -f on a log file is how you watch what a service is doing in real time, not just what it already did.",
        check: { question: "You want to watch a log file update live as a service runs. Which command?", choices: ["cat logfile", "less logfile", "tail -f logfile", "pwd logfile"], correctIndex: 2 }
      },
      {
        id: "l3",
        moduleId: "m2",
        title: "File permissions and ownership",
        body: "ls -l shows permissions as a 10-character string like -rwxr-xr--: the first character is the file type (- for a regular file, d for a directory), then three groups of three — owner, group, and everyone else — each showing read (r), write (w), and execute (x). chmod changes permissions (chmod 755 script.sh gives the owner full access and everyone else read+execute), and chown user:group file changes who owns it. Execute permission on a directory means \"can enter it,\" not \"can run it\" — a common point of confusion.",
        keyTakeaway: "Permissions are owner / group / everyone, each with read, write, and execute — chmod changes them, chown changes who owns the file.",
        check: { question: "What does the \"x\" permission mean on a directory (not a file)?", choices: ["You can execute the directory as a program", "You can enter (cd into) the directory", "You can delete the directory", "It has no effect on directories"], correctIndex: 1 }
      },
      {
        id: "l4",
        moduleId: "m2",
        title: "Processes, services, and package managers",
        body: "ps aux lists every running process; top (or htop if installed) shows them live, sorted by resource usage, which is usually the fastest way to spot what's consuming CPU or memory. Most modern Linux distributions manage background services with systemd — systemctl status nginx shows whether a service is running and its recent log lines, systemctl restart nginx restarts it, and systemctl enable nginx makes it start automatically on boot. To install software, Debian/Ubuntu systems use apt install package-name and Red Hat/CentOS/Fedora systems use dnf install package-name (or the older yum) — same idea, different tool depending on the distribution family.",
        keyTakeaway: "systemctl status/restart/enable is how you check and control services on most modern Linux distributions.",
        check: { question: "Which command shows whether a service is currently running and its recent logs?", choices: ["ps aux", "systemctl status servicename", "apt install servicename", "chmod servicename"], correctIndex: 1 }
      }
    ],
    quiz: [
      { id: "q1", questionType: "single", question: "Where does most Linux system configuration live?", choices: ["/tmp", "/home", "/etc", "/var"], correctIndex: 2 },
      { id: "q2", questionType: "single", question: "A file shows permissions \"-rwxr--r--\". Can someone outside the owner's group run it as a program?", choices: ["Yes, everyone has execute", "No, only the owner has execute permission", "Only the group can", "Permissions don't affect execution"], correctIndex: 1 },
      { id: "q3", questionType: "single", question: "Which command restarts a systemd-managed service?", choices: ["chmod restart nginx", "systemctl restart nginx", "apt restart nginx", "ps restart nginx"], correctIndex: 1 },
      { id: "q4", questionType: "single", question: "On Ubuntu, which command installs a new package?", choices: ["dnf install package", "systemctl install package", "apt install package", "chown install package"], correctIndex: 2 }
    ]
  },
  // Second Academy local-preview course — same real content as the seeded
  // 'networking-fundamentals-for-it-operations' course in migration 0078.
  {
    id: "local-networking-fundamentals",
    slug: "networking-fundamentals-for-it-operations",
    title: "Networking Fundamentals for IT Operations",
    description: "How data actually moves between machines — IP addresses and subnets, DNS, ports and protocols, and the command-line tools you reach for first when something can't connect.",
    level: "beginner",
    estimatedMinutes: 20,
    category: "infrastructure",
    track: "academy",
    freeTier: true,
    modules: [
      { id: "m1", title: "How Networks Actually Move Data" },
      { id: "m2", title: "Ports, Protocols & Troubleshooting" }
    ],
    lessons: [
      {
        id: "l1",
        moduleId: "m1",
        title: "IP addresses and subnets",
        body: "Every device on a network gets an IP address — for IPv4, four numbers 0-255 separated by dots, like 192.168.1.42. A subnet mask (or the /24 shorthand, called CIDR notation) marks off how much of that address identifies the network versus the specific device: 192.168.1.0/24 means the first three numbers identify the network and the last one identifies the device, giving room for 254 usable devices on that network. Two devices can only talk directly without a router if they're on the same subnet — this is why \"what subnet is this on\" is one of the first questions to ask when a device can't reach another one. Private ranges like 192.168.x.x, 10.x.x.x, and 172.16-31.x.x are reserved for internal networks and never routed on the public internet directly, which is why NAT (network address translation) exists at your router's edge.",
        keyTakeaway: "Two devices need to be on the same subnet to talk directly without a router — that's the first thing to check for a \"can't connect\" issue.",
        check: { question: "Two devices are on different subnets. What do they need to communicate?", choices: ["Nothing extra — they can always talk directly", "A router to pass traffic between the subnets", "The same MAC address", "A public IP address each"], correctIndex: 1 }
      },
      {
        id: "l2",
        moduleId: "m1",
        title: "DNS: how names become IP addresses",
        body: "Nobody types an IP address to visit a website — DNS (Domain Name System) translates a human-readable name like example.com into the IP address a computer actually needs to connect. A DNS lookup walks a hierarchy: your device asks a resolver (often your ISP's or a public one like 1.1.1.1), which asks the root servers, which point to the right top-level domain server (.com, .org), which points to the domain's own authoritative nameserver for the final answer. Results are cached for a TTL (time to live) so this whole chain doesn't repeat on every request — which is also why a DNS change (like pointing a domain at a new server) can take time to be visible everywhere: it's waiting for old cached answers to expire.",
        keyTakeaway: "A DNS change isn't instant everywhere — it takes effect as each resolver's cached answer expires according to its TTL.",
        check: { question: "Why doesn't a DNS change show up everywhere instantly?", choices: ["DNS changes are always instant", "Resolvers cache the old answer until its TTL expires", "DNS only updates once a day by design", "It requires restarting every device on the internet"], correctIndex: 1 }
      },
      {
        id: "l3",
        moduleId: "m2",
        title: "Ports and common protocols",
        body: "An IP address gets you to the right machine; a port number gets you to the right service running on it — a single server can run a website on port 443 (HTTPS), email on port 25, and SSH on port 22 simultaneously, each isolated by port number. Some ports are so standard they're assumed by default: 80 for HTTP, 443 for HTTPS, 22 for SSH, 53 for DNS, 3389 for Windows Remote Desktop. TCP is the reliable, connection-based protocol most services use (it confirms delivery and retransmits lost data); UDP is faster but doesn't guarantee delivery, used where speed matters more than perfection, like video streaming or DNS lookups. A firewall's core job is deciding which ports are allowed in or out — \"the connection is refused\" almost always means a firewall or the service itself is blocking that port.",
        keyTakeaway: "A port number routes traffic to the right service on a machine; a firewall's core job is deciding which ports are allowed through.",
        check: { question: "What is the standard port for HTTPS traffic?", choices: ["21", "80", "443", "3389"], correctIndex: 2 }
      },
      {
        id: "l4",
        moduleId: "m2",
        title: "Troubleshooting connectivity from the command line",
        body: "When something can't connect, a fixed sequence of commands narrows down where the problem is. ping tests basic reachability — does a response come back at all, and how long does it take. traceroute (or tracert on Windows) shows every hop the traffic takes to get there, which pinpoints where along the path it's failing, not just that it is failing. netstat or the newer ss command lists active network connections and which ports are actively listening on the local machine — useful for confirming a service is actually running and bound to the port you expect. curl or telnet against a specific host and port tests whether that exact service is reachable, which is more precise than ping (which only tests the network layer, not whether a particular service is actually listening).",
        keyTakeaway: "Work top-down: ping for reachability, traceroute for where it breaks, then test the exact port with curl/telnet.",
        check: { question: "A ping succeeds but a specific service still won't connect. What's the next logical check?", choices: ["The problem must be DNS", "Test the exact host and port directly with curl or telnet", "Restart the entire network", "Ping is proof the service is fine, stop troubleshooting"], correctIndex: 1 }
      }
    ],
    quiz: [
      { id: "q1", questionType: "single", question: "What does a subnet mask (or /24 notation) actually define?", choices: ["The device's MAC address", "How much of an IP address identifies the network versus the device", "The DNS server to use", "The device's hostname"], correctIndex: 1 },
      { id: "q2", questionType: "single", question: "What does DNS actually do?", choices: ["Encrypts network traffic", "Translates human-readable domain names into IP addresses", "Assigns IP addresses to devices", "Blocks unauthorized ports"], correctIndex: 1 },
      { id: "q3", questionType: "single", question: "A server runs a website and SSH at the same time. How does incoming traffic get routed to the right one?", choices: ["By port number", "By MAC address", "By subnet mask", "It can't — one server can only run one service"], correctIndex: 0 },
      { id: "q4", questionType: "single", question: "You can ping a server but a specific web app on it won't load. What's the most useful next step?", choices: ["Assume the whole network is down", "Test the exact port with curl or telnet", "Give up on the network layer entirely", "Change the server's IP address"], correctIndex: 1 }
    ]
  },
  // Same real content as the seeded 'cloud-computing-essentials' course in
  // migration 0073.
  {
    id: "local-cloud-computing-essentials",
    slug: "cloud-computing-essentials",
    title: "Cloud Computing Essentials",
    description: "What \"the cloud\" actually is, the service models (IaaS/PaaS/SaaS) and shared responsibility model, and the core building blocks — compute, storage, and networking — behind AWS, Azure, and every other provider.",
    level: "beginner",
    estimatedMinutes: 18,
    category: "cloud",
    track: "academy",
    freeTier: false,
    modules: [
      { id: "m1", title: "What Cloud Actually Means" },
      { id: "m2", title: "The Building Blocks" }
    ],
    lessons: [
      {
        id: "l1",
        moduleId: "m1",
        title: "IaaS, PaaS, and SaaS",
        body: "The three service models differ in how much a provider manages for you. Infrastructure as a Service (IaaS — e.g. an AWS EC2 virtual machine) gives you raw compute, storage, and networking; you still install and manage the OS and everything above it. Platform as a Service (PaaS — e.g. AWS Elastic Beanstalk or Heroku) manages the OS and runtime for you, so you deploy code and the platform handles scaling and patching. Software as a Service (SaaS — e.g. Gmail or Salesforce) is a finished application you just use — nothing to provision or patch at all. Moving from IaaS toward SaaS trades control for convenience.",
        keyTakeaway: "IaaS gives you raw infrastructure to manage yourself, PaaS manages the runtime for you, SaaS is a finished application you just use.",
        check: { question: "You deploy your own application code and the platform handles the OS, patching, and scaling for you. Which service model is this?", choices: ["IaaS", "PaaS", "SaaS", "None of these"], correctIndex: 1 }
      },
      {
        id: "l2",
        moduleId: "m1",
        title: "The shared responsibility model",
        body: "Cloud security is a shared job, not something you can outsource entirely. The provider (AWS, Azure, GCP) secures \"the cloud\" — physical data centers, the underlying hardware, and the virtualization layer. You're responsible for security \"in the cloud\" — how you configure access controls, which ports you leave open, whether your storage buckets are accidentally public, and how you patch your own operating systems on IaaS. The exact line shifts depending on the service model: the more of the stack the provider manages (PaaS, SaaS), the less you're responsible for — but you're never responsible for zero.",
        keyTakeaway: "The provider secures the underlying cloud infrastructure; you're always responsible for how you configure and use it.",
        check: { question: "Under the shared responsibility model, who is responsible for correctly configuring access permissions on your own cloud storage?", choices: ["The cloud provider, always", "You, the customer", "Neither party — it's automatic", "Only relevant for on-premises systems"], correctIndex: 1 }
      },
      {
        id: "l3",
        moduleId: "m2",
        title: "Compute and storage basics",
        body: "Compute is the processing power that runs your workloads — a virtual machine (like an AWS EC2 instance or Azure VM) behaves like a regular server you can SSH into, while a container (like AWS Fargate or Google Cloud Run) packages an application to run without you managing a full OS underneath it. Storage comes in a few shapes: object storage (like AWS S3) holds files accessed over HTTP, ideal for backups, media, and static website assets; block storage (like an EBS volume) behaves like an attached hard drive for a VM; and managed databases (like AWS RDS) run a real database engine without you administering the underlying server.",
        keyTakeaway: "Object storage is for files over HTTP, block storage attaches to a VM like a hard drive, managed databases run the engine without you administering the server.",
        check: { question: "Which storage type would you use to host static website assets and backups, accessed over HTTP?", choices: ["Block storage", "Object storage", "A managed database", "None — that requires a physical server"], correctIndex: 1 }
      },
      {
        id: "l4",
        moduleId: "m2",
        title: "Networking and regions",
        body: "Cloud providers organize infrastructure into regions (geographic areas, like us-east-1 or eu-west-2), each containing multiple availability zones — physically separate data centers with independent power and networking, so a failure in one doesn't take down the others. A Virtual Private Cloud (VPC) is your own isolated network within a region, where you define subnets, routing, and firewall-like security groups that control what traffic can reach your resources. Placing resources across multiple availability zones is the standard way to build for high availability — if one zone has an outage, the others keep serving traffic.",
        keyTakeaway: "Spreading resources across multiple availability zones within a region is how cloud architectures stay available through a single data-center failure.",
        check: { question: "Why would you deploy an application across multiple availability zones instead of just one?", choices: ["It's required by every cloud provider", "So an outage in one zone doesn't take down the whole application", "It's the only way to get a public IP address", "Availability zones are just a billing concept, not physical separation"], correctIndex: 1 }
      }
    ],
    quiz: [
      { id: "q1", questionType: "single", question: "Which service model gives you the most control but requires you to manage the OS yourself?", choices: ["SaaS", "PaaS", "IaaS", "None of these require OS management"], correctIndex: 2 },
      { id: "q2", questionType: "single", question: "Under the shared responsibility model, what does the cloud provider secure?", choices: ["Your application code", "The underlying physical infrastructure and virtualization layer", "Your firewall rules", "Your access control configuration"], correctIndex: 1 },
      { id: "q3", questionType: "single", question: "What's the difference between block storage and object storage?", choices: ["They are the same thing", "Block storage attaches to a VM like a drive; object storage holds files accessed over HTTP", "Object storage is only for databases", "Block storage cannot be resized"], correctIndex: 1 },
      { id: "q4", questionType: "single", question: "What is an availability zone?", choices: ["A billing region", "A physically separate data center within a cloud region", "A type of virtual machine", "A security group rule"], correctIndex: 1 }
    ]
  },
  // Same real content as the seeded 'intro-to-devops-and-cicd' course in
  // migration 0073.
  {
    id: "local-intro-to-devops-and-cicd",
    slug: "intro-to-devops-and-cicd",
    title: "Introduction to DevOps & CI/CD",
    description: "Why DevOps exists, how a CI/CD pipeline actually works from commit to deploy, and the practices — version control, automated testing, infrastructure as code — that make frequent, reliable releases possible.",
    level: "intermediate",
    estimatedMinutes: 22,
    category: "devops",
    track: "academy",
    freeTier: false,
    modules: [
      { id: "m1", title: "Why DevOps Exists" },
      { id: "m2", title: "How a Pipeline Actually Works" }
    ],
    lessons: [
      {
        id: "l1",
        moduleId: "m1",
        title: "Breaking down the wall between Dev and Ops",
        body: "Historically, a development team wrote code and \"threw it over the wall\" to a separate operations team responsible for deploying and running it — different goals (ship features vs. keep things stable), different tools, and a slow, blame-prone handoff whenever something broke in production. DevOps is the practice of merging those responsibilities: the same team (or closely collaborating teams) builds, tests, deploys, and operates the software, using automation to make frequent releases safe instead of risky. It's a cultural and process shift as much as a toolset — the tools (CI/CD pipelines, infrastructure as code) exist to support that shift, not the other way around.",
        keyTakeaway: "DevOps merges development and operations responsibilities so the same team ships and runs software, using automation to make frequent releases safe.",
        check: { question: "What is DevOps most fundamentally about?", choices: ["A specific tool you install", "Merging development and operations responsibilities with automation to enable safe, frequent releases", "Replacing operations teams entirely with software", "A programming language"], correctIndex: 1 }
      },
      {
        id: "l2",
        moduleId: "m1",
        title: "Version control as the foundation",
        body: "Every DevOps practice assumes code lives in a version control system like Git — a full history of every change, who made it, and why, with the ability to branch (work on a change in isolation) and merge (bring it back into the main codebase) without stepping on other people's work. A pull request (or merge request) is where a proposed change gets reviewed by teammates before it merges — this is the real quality gate in most teams, catching bugs and design issues before code ever reaches a pipeline. Nothing else in a CI/CD pipeline works without this foundation, since the pipeline triggers off changes to the repository.",
        keyTakeaway: "A pull request is where code gets reviewed before merging — the real quality gate before automation even runs.",
        check: { question: "What triggers a CI/CD pipeline to run in most setups?", choices: ["A scheduled time only", "A change pushed to the version control repository", "A manual phone call to operations", "Nothing — pipelines run constantly regardless of changes"], correctIndex: 1 }
      },
      {
        id: "l3",
        moduleId: "m2",
        title: "Continuous Integration: build and test automatically",
        body: "Continuous Integration (CI) means every code change automatically triggers a build and a test run — not \"we'll test it before the next release,\" but on every single commit or pull request. This catches problems within minutes of them being introduced, while the context is still fresh, instead of weeks later during a manual pre-release test pass. A typical CI job: check out the code, install dependencies, run the automated test suite, and report pass/fail back to the pull request — a red (failing) build blocks the change from merging until it's fixed.",
        keyTakeaway: "CI means every commit automatically triggers a build and test run, catching problems within minutes instead of at release time.",
        check: { question: "What does Continuous Integration (CI) mean in practice?", choices: ["Manually testing code once a month", "Every code change automatically triggers an automated build and test run", "Only testing code right before a major release", "Integrating with third-party APIs"], correctIndex: 1 }
      },
      {
        id: "l4",
        moduleId: "m2",
        title: "Continuous Delivery/Deployment and infrastructure as code",
        body: "Continuous Delivery extends CI one step further: once code passes automated tests, it's automatically packaged and made ready to deploy — a human still clicks \"deploy,\" typically to production. Continuous Deployment goes all the way: passing changes deploy automatically, with no manual approval step, relying entirely on the automated tests to be the safety net. Infrastructure as code (tools like Terraform) applies the same version-controlled, automated approach to the servers and cloud resources themselves — instead of manually clicking through a cloud console, infrastructure is defined in files, reviewed like code, and applied automatically, so an environment can be recreated identically instead of drifting over time.",
        keyTakeaway: "Continuous Deployment removes the manual approval step entirely — passing automated tests is what ships the change to production.",
        check: { question: "What's the key difference between Continuous Delivery and Continuous Deployment?", choices: ["They are identical terms", "Continuous Delivery requires a manual approval to deploy; Continuous Deployment deploys automatically with no manual step", "Continuous Deployment is only for infrastructure, not application code", "Continuous Delivery skips automated testing"], correctIndex: 1 }
      }
    ],
    quiz: [
      { id: "q1", questionType: "single", question: "DevOps is best described as:", choices: ["A single software product", "A cultural and process shift merging dev and ops, supported by automation", "A replacement for version control", "A cloud provider"], correctIndex: 1 },
      { id: "q2", questionType: "single", question: "What is a pull request used for?", choices: ["Deploying code directly to production", "Having teammates review a proposed change before it merges", "Deleting old branches", "Installing dependencies"], correctIndex: 1 },
      { id: "q3", questionType: "single", question: "A build automatically runs tests on every commit and reports pass/fail. This is an example of:", choices: ["Continuous Deployment", "Continuous Integration", "Infrastructure as code", "Shared responsibility"], correctIndex: 1 },
      { id: "q4", questionType: "single", question: "What does \"infrastructure as code\" let you do?", choices: ["Write application code faster", "Define and version-control servers/cloud resources so environments can be recreated identically", "Replace the need for testing", "Skip using a cloud provider"], correctIndex: 1 }
    ]
  },
  // Same real content as the seeded 'docker-and-container-fundamentals'
  // course, expanded in migration 0086 into a full ~5-hour program: 7
  // modules, 16 lessons, 6 structured labs, per-module interview
  // questions, and a capstone project (also mirrored in
  // data/terminalDemos.js for the practice-terminal demos keyed by these
  // same lesson titles).
  {
    id: "local-docker-and-container-fundamentals",
    slug: "docker-and-container-fundamentals",
    title: "Docker & Container Fundamentals",
    description: "What a container actually is versus a virtual machine, how to build one with a Dockerfile, and the day-to-day Docker commands — including volumes, networking, and docker-compose — every DevOps course after this one assumes you already know.",
    level: "intermediate",
    estimatedMinutes: 300,
    category: "devops",
    track: "academy",
    freeTier: false,
    capstone: {
      title: "Deploy a production-style containerized web application",
      description: "Build, secure, and run a real multi-container application end to end, using everything from this course — the same shape as a real small production deployment, not a toy example.",
      requirements: [
        "Write a Dockerfile for a real application (any simple Node.js, Python, or static site app) using a multi-stage build",
        "Run the container as a non-root user (USER instruction)",
        "Write a docker-compose.yml with your app plus a database service, connected on a shared network",
        "Use a named volume so the database's data survives a docker compose down / up",
        "Configure all secrets (DB password, API keys) via environment variables or mounted files — never baked into the image",
        "Add a HEALTHCHECK to your app's Dockerfile",
        "Tag and push your image to a registry using an explicit version tag, not latest",
        "Write a one-page runbook: how to deploy this stack, and how to roll it back if the new version fails"
      ],
      deliverable: "A working docker-compose stack you can demonstrate running locally, plus your Dockerfile, compose file, and runbook. This is self-assessed against the checklist above — the goal is real hands-on experience shipping something production-shaped, not an automated grade."
    },
    modules: [
      {
        id: "m1", title: "Why Containers",
        interviewQuestions: [
          { question: "What specific problem do containers solve that virtual machines don't already solve?", answer: "VMs solve isolation but at the cost of a full OS per instance — heavy, slow to boot. Containers solve environment consistency (dependencies packaged with the app) while staying lightweight by sharing the host kernel. The real win is that the same image runs identically everywhere, not that it's \"more isolated\" than a VM." },
          { question: "Why did Docker succeed where earlier container technology like LXC didn't reach the same adoption?", answer: "The isolation technology (namespaces, cgroups) already existed. Docker's win was UX: a simple CLI, a portable image format, and a public registry (Docker Hub) that made packaging and sharing containers accessible to any developer, not just kernel specialists." },
          { question: "What is the OCI and why does it matter to someone using Kubernetes?", answer: "The Open Container Initiative standardized the container image and runtime spec so images aren't locked to Docker's tooling. It's why Kubernetes can run containers via containerd directly without Docker installed on nodes at all." }
        ]
      },
      {
        id: "m2", title: "Working With Docker Day to Day",
        interviewQuestions: [
          { question: "Why is pinning to :latest risky in a production deployment?", answer: "The tag silently points to whatever was pushed most recently, so a redeploy today can pull different image contents than a redeploy last week with no code change on your end. Production should pin to an explicit, immutable tag." },
          { question: "What's the difference between a named volume and a bind mount?", answer: "A named volume is managed entirely by Docker and lives in Docker's own storage area — portable and the right choice for things like database data. A bind mount points at a specific path on the host filesystem, useful for local development when you want the container to see your live source files." }
        ]
      },
      {
        id: "m3", title: "Docker Installation & Setup",
        interviewQuestions: [
          { question: "On Windows or Mac, are you really running \"Linux containers\"?", answer: "Yes — Docker Desktop runs a lightweight Linux VM under the hood on both platforms and routes your containers into it, since neither OS kernel natively supports Linux namespaces/cgroups." },
          { question: "What's the difference between docker run -d and just docker run?", answer: "Without -d, the container runs attached — your terminal blocks and streams its output. With -d it runs detached in the background, and you get your terminal back immediately." },
          { question: "Why would you use --rm during testing?", answer: "It automatically deletes the container as soon as it exits, preventing a pile-up of dead \"Exited\" containers from repeated test runs that you'd otherwise have to clean up manually." }
        ]
      },
      {
        id: "m4", title: "Real-World Docker Administration",
        interviewQuestions: [
          { question: "What's the difference between the \"always\" and \"unless-stopped\" restart policies?", answer: "\"always\" restarts the container even after you manually stop it, if the daemon/host restarts. \"unless-stopped\" behaves the same except it respects an explicit manual stop across a daemon/host restart — it won't come back if you deliberately stopped it." },
          { question: "Why isn't a bare \"is the process running\" check enough to know a container is healthy?", answer: "A process can be alive but deadlocked, out of connections, or otherwise unable to actually serve traffic. A Dockerfile HEALTHCHECK probes real application behavior (e.g. an HTTP endpoint), catching failures a simple process-alive check would miss." },
          { question: "You see exit code 137 in production. What's your first hypothesis and how do you confirm it?", answer: "OOM kill. Confirm with docker inspect <container> --format '{{.State.OOMKilled}}' — if true, the fix is raising the memory limit or fixing a leak, not just restarting it." }
        ]
      },
      {
        id: "m5", title: "Docker Security & Best Practices",
        interviewQuestions: [
          { question: "Why run a container as a non-root user even though it's already isolated by namespaces?", answer: "Namespace isolation isn't perfect — container-escape vulnerabilities exist. If a process is compromised while running as non-root inside the container, an escape hands the attacker a much less privileged foothold than if it were running as root." },
          { question: "Where should a database password live for a containerized app — and where should it never live?", answer: "It should live in a mounted secret file or an external secrets manager (Vault, AWS Secrets Manager). It should never be baked into an image layer or passed as a plain ENV variable, since both are readable by anyone who can inspect the image or exec into the container." },
          { question: "What's the security benefit of a minimal/distroless base image over a full OS image?", answer: "Every extra package, shell, and tool in the image is potential attack surface. A minimal image has far fewer components an attacker could exploit if they gain any code execution inside the container." }
        ]
      },
      {
        id: "m6", title: "Monitoring & Troubleshooting",
        interviewQuestions: [
          { question: "Walk through your troubleshooting order for a container that keeps crash-looping.", answer: "docker ps -a to confirm status and restart count, docker logs for the actual error, docker inspect for exit code and mount configuration, and only then docker exec if it's staying up long enough to get a shell into." },
          { question: "A container is \"running\" but the app inside seems unresponsive. What would catch this that a simple process check wouldn't?", answer: "A Dockerfile HEALTHCHECK that actively probes the application (e.g. curling a health endpoint) rather than just checking that the process PID exists — the process can be alive and deadlocked at the same time." }
        ]
      },
      {
        id: "m7", title: "Docker in Production & CI/CD",
        interviewQuestions: [
          { question: "In a CI/CD pipeline, where should image vulnerability scanning happen and why?", answer: "As a gate before pushing to a registry other environments pull from — so a vulnerable dependency fails the build and never reaches production, rather than being discovered after it's already deployed." },
          { question: "Why does Dockerfile layer ordering matter for CI pipeline speed?", answer: "Docker caches each layer; ordering rarely-changing steps (dependency installs) before frequently-changing ones (source code copy) means most commits only invalidate and rebuild the last layer or two, not the entire image." }
        ]
      }
    ],
    lessons: [
      {
        id: "l1", moduleId: "m1",
        title: "Why containers replaced traditional deployment",
        body: "For years, the standard way to ship software was: a developer writes code, it works on their machine, then it gets deployed to a server with a different OS version, different library versions, different everything — and it breaks. This is the classic \"works on my machine\" problem, and it turned every deployment into a debugging session. The old model looked like: Developer writes code → hands it to Ops → Ops fights server differences → application finally runs, maybe. Containers collapse that chain: Developer writes code → packages it with every dependency it needs into a container image → that exact same image runs identically on a laptop, a test server, and production, because the container carries its own filesystem and dependencies with it. Netflix, Spotify, and most large tech companies run thousands of services this way specifically because it removes environment drift as a category of bug entirely — not because containers are trendy, but because \"it works in the image\" is a guarantee \"it works on my machine\" never was.",
        keyTakeaway: "Containers don't make software better — they make the environment it runs in identical everywhere, which eliminates an entire category of deployment bugs.",
        check: { question: "What specific problem do containers solve that made companies adopt them at scale?", choices: ["They make code run faster", "They guarantee the exact same environment everywhere, eliminating 'works on my machine' bugs", "They are required by cloud providers", "They replace the need for testing"], correctIndex: 1 }
      },
      {
        id: "l2", moduleId: "m1",
        title: "Containers vs. virtual machines",
        body: "A virtual machine virtualizes an entire computer — its own kernel, its own OS, running on top of a hypervisor — which makes it heavy (gigabytes, minutes to boot) but fully isolated. A container shares the host machine's kernel and only packages the application plus its dependencies, making it lightweight (megabytes, starts in seconds) while still isolating the app's filesystem, processes, and network from everything else on the host. The tradeoff: a VM can run a completely different OS than its host; a Linux container needs a Linux kernel underneath (which is why Docker on Mac/Windows quietly runs a small Linux VM to host the containers). For most application deployment, containers win on speed and density — running far more containers than VMs on the same hardware — which is why they became the default unit of deployment for modern applications.",
        keyTakeaway: "Containers share the host kernel and only package the app plus dependencies — lightweight and fast, but not a full separate OS like a VM.",
        check: { question: "What is the key difference between a container and a virtual machine?", choices: ["Containers are always slower to start", "A container shares the host kernel instead of virtualizing a whole OS", "Virtual machines use less disk space", "There is no real difference"], correctIndex: 1 }
      },
      {
        id: "l3", moduleId: "m1",
        title: "A brief history: from chroot to the OCI standard",
        body: "Process isolation on Linux didn't start with Docker. chroot (1979) restricted a process to a subset of the filesystem. LXC (Linux Containers, 2008) added namespaces and cgroups for real isolation and resource limits — the same kernel features Docker still uses today. What Docker actually invented in 2013 wasn't the isolation technology; it was the developer experience: a simple CLI, a shareable image format, and Docker Hub as a place to publish and pull images — turning a kernel feature only specialists used into something any developer could use in an afternoon. That popularity created a problem: everyone building container tooling risked locking users into one vendor's image format. The Open Container Initiative (OCI) standardized the image format and runtime spec in 2015, so an image built with Docker can run under containerd, CRI-O, or Podman without changes. This is why Kubernetes doesn't actually depend on Docker itself anymore — it runs OCI-compliant containers through containerd directly.",
        keyTakeaway: "Docker's real innovation was developer experience, not the isolation tech — and the OCI standard it helped create means container images now outlive any single vendor's tooling.",
        check: { question: "What did the OCI standard actually solve?", choices: ["It invented process isolation on Linux", "It standardized image/runtime formats so containers aren't locked to one vendor's tooling", "It replaced the need for a container runtime", "It created Docker Hub"], correctIndex: 1 }
      },
      {
        id: "l4", moduleId: "m1",
        title: "Images, containers, and the Dockerfile",
        body: "An image is a read-only template — application code, a runtime, libraries, and configuration, all bundled together — and a container is a running instance of that image, the same relationship a class has to an object. A Dockerfile is the recipe that builds an image: FROM picks a base image (like python:3.12 or node:20), COPY adds your application files in, RUN executes setup commands (like installing dependencies) at build time, and CMD defines what runs when a container starts from it. Images are built in layers, and Docker caches each layer — reordering a Dockerfile so rarely-changing steps (like installing dependencies) come before frequently-changing steps (like copying your source code) means most builds only re-run the last layer or two, dramatically speeding up iteration.",
        keyTakeaway: "Order a Dockerfile so rarely-changing steps come first — Docker's layer cache means only the changed layers rebuild.",
        check: { question: "In a Dockerfile, what does the RUN instruction do?", choices: ["Starts the container when it runs", "Executes a command at image build time, like installing dependencies", "Copies files from the host into the image", "Names the resulting image"], correctIndex: 1 }
      },
      {
        id: "l5", moduleId: "m1",
        title: "Docker Hub and image registries",
        body: "A registry stores and distributes container images — Docker Hub is the default public one, but AWS ECR, Azure ACR, Google Artifact Registry, and self-hosted Harbor all serve the same purpose privately. Not every image on a public registry is equally trustworthy: Docker Official Images (maintained by Docker in collaboration with upstream projects, like postgres or nginx) and Verified Publisher images carry real accountability; an arbitrary user-uploaded image does not, and pulling one straight into production is a real supply-chain risk — you're running someone else's unaudited code with root-level access to your host's kernel. Tagging matters just as much: :latest is whatever was pushed most recently, which silently changes underneath you — a redeploy today can pull a different image than a redeploy last week. Production systems pin to an explicit, immutable tag (a version number or a git commit SHA) specifically so the same tag always resolves to the same bytes.",
        keyTakeaway: "Pin to an explicit, immutable tag in production — never :latest — and treat pulling an unverified public image with the same scrutiny as installing unaudited software.",
        check: { question: "Why is deploying with the :latest tag risky in production?", choices: ["It uses more disk space", "It silently points to different image contents over time, so the same tag can deploy different code on different days", "It's slower to pull", "It only works with Docker Hub"], correctIndex: 1 }
      },
      {
        id: "l6", moduleId: "m2",
        title: "Core Docker commands",
        body: "docker build -t myapp . builds an image from the Dockerfile in the current directory and tags it \"myapp\". docker run -d -p 8080:80 myapp starts a container from that image in the background (-d, detached) and maps port 8080 on the host to port 80 inside the container — without that mapping, the container's port is only reachable from other containers, not the host machine. docker ps lists running containers; add -a to see stopped ones too. docker logs <container> shows a container's output, the first place to look when something crashes right after starting. docker exec -it <container> bash opens an interactive shell inside a running container — useful for poking around, though a container you're regularly shelling into to fix things is usually a sign the image itself needs fixing instead.",
        keyTakeaway: "-p host:container maps a port out to the host — without it, a container's service is only reachable from other containers.",
        check: { question: "What does the -p flag do in `docker run -p 8080:80 myapp`?", choices: ["Names the container", "Maps port 8080 on the host to port 80 inside the container", "Pauses the container after starting", "Pulls a newer image version"], correctIndex: 1 }
      },
      {
        id: "l7", moduleId: "m2",
        title: "Volumes, networking, and docker-compose",
        body: "A container's own filesystem is ephemeral — delete the container and any data written inside it is gone. A volume (docker run -v mydata:/var/lib/data) persists data outside the container's lifecycle, on the host, so a database container can be recreated without losing its data. By default, containers on the same Docker network can reach each other by container name — Docker's built-in DNS resolves \"database\" to the right container IP automatically, no hardcoded IPs needed. Running a real application usually means multiple containers (a web app, a database, a cache), and docker-compose.yml describes all of them — images, ports, volumes, and the network linking them — as one file, so `docker compose up` starts the entire stack with one command instead of a series of manual docker run commands typed in the right order.",
        keyTakeaway: "A volume persists data outside a container's lifecycle; docker-compose describes a whole multi-container stack as one file.",
        check: { question: "Why use a volume instead of just writing data inside the container?", choices: ["Volumes are required for a container to start", "A container's own filesystem is deleted with the container — a volume persists data outside it", "Volumes make the image smaller", "There is no difference"], correctIndex: 1 }
      },
      {
        id: "l8", moduleId: "m3",
        title: "Installing Docker: Engine, Desktop, and verifying your setup",
        body: "Docker ships two different ways depending on your OS. On Linux, Docker Engine installs directly as a daemon (dockerd) talking to the kernel — this is also what every production Linux server actually runs. On Mac and Windows, there's no native container support in the OS kernel, so Docker Desktop quietly runs a small Linux VM (via a lightweight hypervisor) and routes your docker commands into it — meaning even on a Mac, your containers are still fundamentally Linux containers. Once installed, docker --version confirms the CLI is present, and docker run hello-world is the real smoke test: it pulls a tiny image, runs it, and prints a confirmation message, proving the CLI, the daemon, and image-pulling all work end to end.",
        keyTakeaway: "On Mac/Windows, Docker Desktop is running a Linux VM behind the scenes — your containers are always Linux containers, regardless of your host OS.",
        check: { question: "On macOS, what is Docker Desktop actually doing when you run a container?", choices: ["Running the container natively on macOS's kernel", "Running a lightweight Linux VM behind the scenes and routing containers into it", "Emulating Linux instructions in software", "Nothing — Mac containers don't use Linux at all"], correctIndex: 1 },
        lab: {
          objective: "Get Docker running locally and confirm the full CLI-to-daemon-to-registry path works.",
          environment: "Linux, macOS, or Windows with virtualization enabled",
          tools: ["Docker Engine (Linux) or Docker Desktop (Mac/Windows)", "A terminal"],
          steps: [
            "Install Docker Engine (Linux) or Docker Desktop (Mac/Windows) from docker.com",
            "Run docker --version to confirm the CLI is installed",
            "Run docker run hello-world to pull and run the test image",
            "Run docker info to see your daemon's configuration, including the storage driver"
          ],
          troubleshooting: "Linux 'permission denied' on the socket → your user isn't in the docker group yet (sudo usermod -aG docker $USER, then log out/in). Docker Desktop stuck starting on Windows → WSL2 backend isn't enabled or needs an update. 'Cannot connect to the Docker daemon' → the daemon/Desktop app isn't actually running yet.",
          challenge: "Run docker info and identify which storage driver your installation is using (look for the Storage Driver line)."
        }
      },
      {
        id: "l9", moduleId: "m3",
        title: "Your first container: the Docker CLI",
        body: "docker run is doing three things at once: pulling the image if it isn't local yet, creating a container from it, and starting it. The flags change how it runs: -d runs it detached (in the background, returning your terminal immediately) instead of attached (blocking, streaming output to your terminal); -it allocates an interactive terminal, essential for anything you want to type into, like a shell; -p 8080:80 maps port 8080 on your host to port 80 inside the container — without it, the container's port is invisible outside the container network; --name gives it a memorable name instead of Docker's random one; --rm deletes the container automatically the moment it stops, useful for throwaway testing. docker ps shows what's currently running; docker ps -a includes stopped containers too — a container doesn't disappear when it stops, it just stops, and still exists until you docker rm it (or ran it with --rm).",
        keyTakeaway: "A stopped container isn't gone — docker ps -a still shows it, and it exists until removed. --rm is how you avoid accumulating dead containers during testing.",
        check: { question: "You ran a container without --rm and it has since stopped. Where did it go?", choices: ["It was automatically deleted", "It still exists — docker ps -a will show it as Exited until you remove it", "It's paused and will resume automatically", "Docker keeps it running invisibly"], correctIndex: 1 },
        lab: {
          objective: "Get comfortable with the core container lifecycle commands you'll use every day.",
          environment: "A working Docker installation from the previous lab",
          tools: ["Docker CLI"],
          steps: [
            "Run docker run -d --name web -p 8080:80 nginx and visit localhost:8080",
            "Run docker ps to see it running, then docker stop web",
            "Run docker ps -a to see it still listed as Exited",
            "Run docker start web to bring it back, then docker rm -f web to remove it entirely",
            "Run docker run -it --rm ubuntu bash to get an interactive shell, then exit and confirm with docker ps -a that it's gone"
          ],
          troubleshooting: "'port is already allocated' → something else is already using 8080; stop it or pick a different host port. Container exits immediately after docker run -d → check docker logs <name>, the process inside likely crashed or the image expects a command that wasn't given.",
          challenge: "Start an nginx container without -p at all, then try to curl it from your host. Explain in one sentence why it fails."
        }
      },
      {
        id: "l10", moduleId: "m4",
        title: "Container lifecycle, logging, and health checks",
        body: "A container's restart policy decides what happens when it stops: no (default) never restarts it automatically; on-failure restarts only if it exited with a non-zero code; always restarts no matter what, even after a manual stop (until you explicitly stop it again); unless-stopped is like always, but respects a manual stop across a host reboot. A HEALTHCHECK in a Dockerfile lets Docker actively probe whether the app inside is actually working, not just whether the process is alive — a container can be \"running\" while its web server is deadlocked and unable to serve a single request; a healthcheck catches that, a bare process check doesn't. When something goes wrong, docker logs <container> is the first stop, docker logs -f follows it live, and docker logs --tail 100 limits it to the recent lines instead of scrolling back through everything. The container's exit code is a real diagnostic clue: 0 means clean exit, 1 usually means the application itself errored, 137 means it was killed with SIGKILL (very often an out-of-memory kill), and 143 means it received SIGTERM (a graceful stop request).",
        keyTakeaway: "Exit code 137 almost always means the container was OOM-killed — check docker inspect for the OOMKilled flag before assuming it's an application bug.",
        check: { question: "A container's exit code is 137. What does that most likely mean?", choices: ["The application had a bug", "It was killed with SIGKILL — very often an out-of-memory kill", "It exited cleanly", "Networking failed"], correctIndex: 1 },
        lab: {
          objective: "Diagnose why a container keeps restarting, using logs and exit codes rather than guessing.",
          environment: "A working Docker installation",
          tools: ["Docker CLI"],
          steps: [
            "Run docker run -d --name flaky --restart on-failure busybox sh -c \"echo starting; sleep 2; exit 1\"",
            "Wait ~15 seconds, then run docker ps -a and note the restart count",
            "Run docker logs flaky to see its output history across restarts",
            "Run docker inspect flaky --format '{{.State.ExitCode}}' to confirm the exit code",
            "Clean up with docker rm -f flaky"
          ],
          troubleshooting: "Restart count keeps climbing forever → that's expected with on-failure and a command that always exits 1; in a real incident, this is exactly the symptom that should send you to docker logs immediately, not to restarting it again.",
          challenge: "Change the restart policy to no and re-run the same test. Explain what you'd see differently in docker ps -a."
        }
      },
      {
        id: "l11", moduleId: "m4",
        title: "Resource limits and performance",
        body: "By default, a single container can consume all of the host's CPU and memory — one runaway process can starve every other container on the same machine, a real production incident pattern called the \"noisy neighbor\" problem. --memory caps how much RAM a container can use; hit the limit and the kernel's OOM killer terminates it (that's the 137 exit code from the previous lesson). --cpus caps how much CPU time it can consume, expressed as a count of cores (e.g. --cpus=1.5). Under the hood, both are enforced by cgroups (control groups), the same Linux kernel feature that made LXC-style isolation possible in the first place — Docker didn't invent resource limiting, it just made it a one-flag command instead of manual cgroup configuration. docker stats shows live CPU/memory/network usage per container, the fastest way to confirm whether a container is actually near its limit or the slowdown is happening somewhere else entirely.",
        keyTakeaway: "An unbounded container can starve every other container on the same host — always set --memory and --cpus limits before running anything in a shared/production environment.",
        check: { question: "What Linux kernel feature does --memory and --cpus actually rely on to enforce limits?", choices: ["Namespaces", "cgroups (control groups)", "The OCI runtime spec", "Docker's own custom scheduler"], correctIndex: 1 },
        lab: {
          objective: "See resource limits actually take effect, including what an OOM kill looks like from the outside.",
          environment: "A working Docker installation",
          tools: ["Docker CLI", "stress-ng or a small memory-allocating script"],
          steps: [
            "Run docker run -d --name limited --memory=50m polinux/stress stress --vm 1 --vm-bytes 100M",
            "Run docker ps -a and confirm the container has already exited",
            "Run docker inspect limited --format '{{.State.OOMKilled}}' and confirm it shows true",
            "Re-run with --memory=200m instead and confirm it now stays running with docker stats limited"
          ],
          troubleshooting: "Image not found → stress/stress-ng images vary by architecture (Apple Silicon vs. Intel); substitute any small memory-stress image available for your platform.",
          challenge: "Using docker stats, find a way to confirm a running container's CPU usage while it's under a --cpus=0.5 limit, and explain what you'd expect to see if it tries to use more."
        }
      },
      {
        id: "l12", moduleId: "m5",
        title: "Image security and minimal, multi-stage builds",
        body: "Every package, tool, and library in your image is something an attacker could potentially exploit — a full Ubuntu base image carries a shell, package managers, and dozens of libraries you'll never use in production, all of it attack surface. Minimal base images (alpine, or \"distroless\" images with no shell or package manager at all) cut that surface down dramatically. Multi-stage builds solve a related problem: compiling an application often needs a compiler, build tools, and dev dependencies that have no business existing in the final running image. A multi-stage Dockerfile uses one FROM stage to build the app, then a second, separate FROM stage that copies only the compiled output into a clean, minimal base — the build tools never make it into what actually ships. Image scanning tools (Trivy, Docker Scout, Snyk) check every layer against known-CVE databases, catching a vulnerable base image or dependency before it reaches production rather than after.",
        keyTakeaway: "A multi-stage build lets you compile with a full toolchain in one stage, then ship only the compiled output in a minimal final image — build tools never reach production.",
        check: { question: "What problem does a multi-stage Dockerfile build solve?", choices: ["It makes builds run faster only", "It lets you use build tools/compilers in one stage while shipping only the compiled output in a minimal final image", "It replaces the need for a registry", "It automatically scans for vulnerabilities"], correctIndex: 1 }
      },
      {
        id: "l13", moduleId: "m5",
        title: "Container security best practices",
        body: "By default, a process inside a container runs as root — and while namespaces isolate it from the host, a container-escape vulnerability (a real, if uncommon, category of bug) turns \"root inside the container\" into a much scarier \"root on the host.\" A USER instruction in the Dockerfile, running the process as a non-root user, removes an entire class of risk even if something inside the container is compromised. Never mount the Docker socket (/var/run/docker.sock) into a container unless you fully understand the implication: a container with access to the host's Docker socket can create new containers with full host access — effectively root on the host, no escape needed. Secrets (API keys, database passwords) should never be baked into an image layer or passed as a plain ENV — both are visible to anyone who can inspect the image or exec into the container; use mounted secret files or a real secrets manager (Vault, AWS Secrets Manager) instead. --cap-drop=ALL plus only the specific Linux capabilities a container actually needs is the least-privilege default most production setups should start from.",
        keyTakeaway: "Mounting the Docker socket into a container effectively hands it root on the host — treat that mount with the same caution as handing out a root SSH key.",
        check: { question: "Why is mounting /var/run/docker.sock into a container a serious security risk?", choices: ["It slows down the container", "It gives that container the ability to create new containers with full host access — effectively root on the host", "It's only a risk on Windows", "It prevents the container from starting"], correctIndex: 1 }
      },
      {
        id: "l14", moduleId: "m6",
        title: "Debugging a failed container, systematically",
        body: "Guessing wastes time; a fixed sequence finds the real cause faster. First, docker ps -a — is it actually stopped, or did it never start (look at STATUS)? Second, docker logs <name> — this alone answers most failures: a missing environment variable, a config file that doesn't exist, a stack trace from the app itself. Third, docker inspect <name> — check the exit code, the mounts (is a volume actually where the app expects it?), and restart count. If it's still running but misbehaving, docker exec -it <name> sh gets you a shell inside to poke around directly. A handful of causes cover most real incidents: a missing or misspelled environment variable the app requires at startup; the wrong CMD/ENTRYPOINT for what the image actually expects; a port collision on the host; a volume mount with the wrong permissions for the user the process runs as inside the container. Working this list in order, instead of randomly restarting things, is what separates a two-minute diagnosis from a twenty-minute one.",
        keyTakeaway: "Work the same order every time: docker ps -a for status, docker logs for what happened, docker inspect for exit code/mounts, docker exec only once it's confirmed running.",
        check: { question: "A container exits immediately after docker run. What's the first command to run?", choices: ["docker restart", "docker logs <name>", "docker rm -f", "docker system prune"], correctIndex: 1 },
        lab: {
          objective: "Practice the real troubleshooting sequence against a deliberately broken container.",
          environment: "A working Docker installation",
          tools: ["Docker CLI"],
          steps: [
            "Run docker run -d --name broken -e REQUIRED_VAR= postgres:16 (missing a required password variable)",
            "Run docker ps -a and note it exited quickly",
            "Run docker logs broken and read the actual error message from postgres itself",
            "Fix it: docker rm broken then re-run with -e POSTGRES_PASSWORD=devpass and confirm it now stays running"
          ],
          troubleshooting: "If the error message doesn't obviously point to a missing variable, that's realistic — read the full log output, not just the last line; the real cause is often a few lines up from where the container gives up.",
          challenge: "Deliberately misspell POSTGRES_PASSWORD as POSTGRES_PASSWRD and predict what docker logs will show before running it."
        }
      },
      {
        id: "l15", moduleId: "m7",
        title: "Docker Compose for real multi-container apps",
        body: "Almost nothing real is a single container — a typical app is a web service, a database, and maybe a cache, each with its own image, ports, and configuration. docker-compose.yml describes the entire stack in one file: each service maps to one container, depends_on controls startup order (though not full readiness — a database container \"starting\" isn't the same as being ready to accept connections, which is what a healthcheck is for), environment sets variables per service, and a shared networks entry lets services reach each other by service name automatically, the same Docker DNS behavior from the networking lesson. docker compose up starts the whole stack, -d runs it detached, docker compose logs -f follows every service's logs together, and docker compose down tears it all down — one command replacing a sequence of manual docker run commands that have to be typed in exactly the right order every time.",
        keyTakeaway: "depends_on controls start order, not readiness — a database container starting isn't the same as being ready for connections; that gap is what healthchecks exist to close.",
        check: { question: "In docker-compose.yml, what does depends_on actually guarantee?", choices: ["The dependency service is fully ready to accept connections", "Only that the dependency container has started — not that it's ready", "Nothing — it's ignored by Compose", "It sets up networking between services"], correctIndex: 1 },
        lab: {
          objective: "Stand up a real multi-container app (web + database) from a single compose file.",
          environment: "A working Docker installation with Compose (bundled with Docker Desktop, or the docker-compose-plugin on Linux)",
          tools: ["Docker Compose"],
          steps: [
            "Create a docker-compose.yml with two services: web (nginx, port 8080:80) and db (postgres:16, with POSTGRES_PASSWORD set, and a named volume for /var/lib/postgresql/data)",
            "Run docker compose up -d",
            "Run docker compose ps to confirm both services are up",
            "Run docker compose logs db to confirm postgres finished initializing",
            "Run docker compose down — then docker compose up -d again and confirm the database's data persisted"
          ],
          troubleshooting: "'web' can't reach 'db' by hostname → confirm both services are on the same compose network (they are, by default, unless you've defined custom networks that separate them).",
          challenge: "Add a third cache service using redis, and confirm from inside the web container (docker compose exec web sh) that ping cache resolves — proving Docker's built-in service-name DNS."
        }
      },
      {
        id: "l16", moduleId: "m7",
        title: "Docker in CI/CD pipelines",
        body: "A CI/CD pipeline typically builds a Docker image as its final artifact: checkout code, run tests, then docker build and push to a registry the deployment environment can pull from. Tagging strategy matters here more than anywhere else: tagging every build with the git commit SHA (or a semantic version) means you can always trace a running container back to the exact code that produced it — tagging everything latest throws that traceability away. Image scanning belongs as a pipeline gate, not an afterthought: scan the built image for known CVEs before pushing it to a registry other environments will pull from, so a vulnerable dependency fails the build instead of reaching production quietly. Layer caching is what keeps pipeline builds fast: ordering a Dockerfile so rarely-changing steps (installing dependencies) happen before frequently-changing steps (copying source code) means a pipeline that runs on every commit only rebuilds the last layer or two most of the time, not the whole image from scratch.",
        keyTakeaway: "Tag every CI-built image with its git commit SHA, not just latest — it's the difference between being able to trace a production incident back to exact code and not being able to.",
        check: { question: "Why tag CI-built images with a git commit SHA instead of only 'latest'?", choices: ["It makes builds faster", "It lets you trace exactly which code produced any running container, which 'latest' alone doesn't provide", "It's required by Docker Hub", "It reduces image size"], correctIndex: 1 }
      }
    ],
    quiz: [
      { id: "q1", questionType: "single", question: "What is the most fundamental difference between a container and a VM?", choices: ["Containers cost more to run", "A container shares the host kernel instead of virtualizing a full OS", "VMs start faster than containers", "Containers cannot run on Linux"], correctIndex: 1 },
      { id: "q2", questionType: "single", question: "What does a Dockerfile's CMD instruction define?", choices: ["What runs when a container starts from the built image", "The base image to build from", "Which files get copied into the image", "The image's tag name"], correctIndex: 0 },
      { id: "q3", questionType: "single", question: "A container is stopped and removed. What happens to data it wrote to a mounted volume?", choices: ["It is deleted along with the container", "It persists, since a volume lives outside the container's lifecycle", "It moves to a random other container", "Volumes only work for read-only data"], correctIndex: 1 },
      { id: "q4", questionType: "single", question: "What problem does docker-compose solve?", choices: ["It replaces the need for a Dockerfile", "It describes and starts a whole multi-container application from one file instead of many manual commands", "It makes images smaller", "It is required for any container to run"], correctIndex: 1 },
      { id: "q5", questionType: "single", question: "What's the main risk of pulling an arbitrary, unverified image from a public registry into production?", choices: ["It will be slower to start", "You're running someone else's unaudited code with root-level access to your host's kernel", "It costs more to store", "It won't support volumes"], correctIndex: 1 },
      { id: "q6", questionType: "single", question: "A container exits with code 137. What does that most likely indicate?", choices: ["A clean, intentional exit", "It was OOM-killed (SIGKILL, often out of memory)", "A network timeout", "A missing Dockerfile instruction"], correctIndex: 1 },
      { id: "q7", questionType: "single", question: "What Linux kernel mechanism does --memory and --cpus rely on?", choices: ["Namespaces only", "cgroups", "The OCI runtime spec", "Docker's proprietary scheduler"], correctIndex: 1 },
      { id: "q8", questionType: "single", question: "Why is mounting the Docker socket into a container dangerous?", choices: ["It slows the container down", "It effectively grants that container root access to the host", "It's only a Windows-specific issue", "It disables logging"], correctIndex: 1 },
      { id: "q9", questionType: "multiple", question: "Select every real Docker security best practice (choose all that apply):", choices: ["Run containers as a non-root user where possible", "Bake secrets directly into the image so they're always available", "Scan images for known CVEs before deploying", "Use minimal or distroless base images to reduce attack surface"], correctIndexes: [0, 2, 3] },
      { id: "q10", questionType: "ordering", question: "Arrange the correct troubleshooting order for a crashing container:", choices: ["docker inspect for exit code and mounts", "docker ps -a for status", "docker exec for a live shell (if running)", "docker logs for the actual error"], correctOrder: [1, 3, 0, 2] }
    ]
  },
  // Same real content as the seeded
  // 'kubernetes-fundamentals-pods-and-cluster-triage' course in migration
  // 0080 (also mirrored in data/terminalDemos.js for the kubectl practice
  // terminal demos keyed by these same lesson titles).
  {
    id: "local-kubernetes-fundamentals",
    slug: "kubernetes-fundamentals-pods-and-cluster-triage",
    title: "Kubernetes Fundamentals: Pods & Cluster Triage",
    description: "What a Pod and a Deployment actually are, how Services give them stable networking, and the kubectl workflow for diagnosing a broken deployment — CrashLoopBackOff, ImagePullBackOff, and the other failures you'll actually hit running a cluster.",
    level: "intermediate",
    estimatedMinutes: 24,
    category: "devops",
    track: "academy",
    freeTier: false,
    minPlan: "BUSINESS",
    modules: [
      { id: "m1", title: "Kubernetes Core Concepts" },
      { id: "m2", title: "Operating and Troubleshooting a Cluster" }
    ],
    lessons: [
      {
        id: "l1",
        moduleId: "m1",
        title: "Pods, Deployments, and the Kubernetes API",
        body: "A Pod is the smallest deployable unit in Kubernetes — one or more containers that share the same network namespace and storage, always scheduled together on the same node. You almost never create a bare Pod directly, because a Pod that dies stays dead: nothing brings it back. A Deployment describes the desired state instead — \"I want 3 replicas of this container running\" — and Kubernetes' control loop continuously reconciles reality toward that desired state, recreating a Pod the moment it disappears. Under the hood, a Deployment manages a ReplicaSet, which manages the actual Pods; you edit the Deployment, and the ReplicaSet/Pod layers below it exist so a rolling update can spin up new Pods before tearing down old ones instead of causing an outage.",
        keyTakeaway: "A bare Pod that dies stays dead — a Deployment is what actually keeps the desired number of replicas running.",
        check: { question: "Why do you almost always use a Deployment instead of creating a Pod directly?", choices: ["Pods are deprecated", "A Deployment automatically recreates a Pod that dies to maintain the desired replica count", "Deployments are required for networking to work at all", "There is no real difference"], correctIndex: 1 }
      },
      {
        id: "l2",
        moduleId: "m1",
        title: "Services and networking",
        body: "Every Pod gets its own IP address, but that address is ephemeral — the moment a Pod is recreated (a redeploy, a crash, a node failure), it gets a new one. Nothing that depends on a stable address to reach your application, like other services or a load balancer, can track a Pod IP directly. A Service solves this: it's a stable virtual IP and DNS name that load-balances traffic across every currently-running Pod matching a label selector, updating automatically as Pods come and go. ClusterIP (the default) is only reachable from inside the cluster — for internal service-to-service traffic. NodePort opens a port on every node for external access, mostly used for testing. LoadBalancer provisions an actual cloud load balancer (on a cloud provider that supports it) for real external traffic. Other Pods reach a Service by its DNS name (like `my-service.my-namespace.svc.cluster.local`) rather than any IP at all, which is what makes the whole system resilient to Pods being replaced constantly.",
        keyTakeaway: "A Service is a stable name/IP that load-balances across whichever Pods currently match its label selector — Pod IPs themselves are never something to depend on.",
        check: { question: "Why shouldn't another service connect directly to a Pod's IP address?", choices: ["Pod IPs are always the same, so this is actually fine", "A Pod's IP changes every time it's recreated — a Service provides the stable address instead", "Pods don't have IP addresses", "It is required for security reasons only"], correctIndex: 1 }
      },
      {
        id: "l3",
        moduleId: "m2",
        title: "kubectl essentials",
        body: "`kubectl get pods` lists Pods and their status at a glance — Running (healthy), Pending (waiting to be scheduled, often on insufficient cluster resources), CrashLoopBackOff (the container keeps starting and immediately dying), and ImagePullBackOff (Kubernetes can't pull the container image, usually a typo in the image name/tag or a private registry auth problem). `kubectl describe pod <name>` is the single most useful troubleshooting command — its Events section at the bottom shows exactly what Kubernetes tried and what failed, in order, which is almost always more informative than the status alone. `kubectl logs <pod>` shows what the application itself printed — add `--previous` to see the logs from the last crashed instance of a CrashLoopBackOff pod, since by the time you look, it may have already restarted with a fresh, empty log. `kubectl exec -it <pod> -- sh` opens a shell inside a running container, the same escape hatch `docker exec` is for a container.",
        keyTakeaway: "`kubectl describe pod` and its Events section is almost always more informative than the status column alone — that's where the real failure reason shows up.",
        check: { question: "A crashed pod has already restarted, so `kubectl logs` shows nothing useful. What do you add to see the previous crash's logs?", choices: ["--all", "--previous", "--force", "--tail=0"], correctIndex: 1 }
      },
      {
        id: "l4",
        moduleId: "m2",
        title: "Triage: diagnosing a broken deployment",
        body: "A repeatable sequence handles most real Kubernetes incidents. First, `kubectl get pods` to see which Pods are unhealthy and their status code (CrashLoopBackOff vs. ImagePullBackOff point to very different problems). Second, `kubectl describe pod <name>` for the Events section — this catches scheduling failures (insufficient CPU/memory on any node), failed readiness/liveness probes, and image pull errors immediately. Third, `kubectl logs <name>` (with `--previous` if it already restarted) to see what the application itself said before it died — a stack trace, a missing environment variable, a database connection refused. Common real causes: a typo'd image tag, a ConfigMap or Secret the Pod expects that doesn't exist or was renamed, a liveness probe with too short a timeout killing a slow-starting app, or requesting more CPU/memory than any node has available. Once you've found and fixed the cause, `kubectl scale deployment <name> --replicas=N` adjusts capacity, and `kubectl rollout restart deployment <name>` forces fresh Pods to pick up a fixed ConfigMap/Secret without a new image.",
        keyTakeaway: "Work the same order every time: get pods for the symptom, describe pod for the Events section, logs (--previous if needed) for what the app itself said.",
        check: { question: "A pod shows ImagePullBackOff. What does that specifically point to?", choices: ["The application crashed after starting", "Kubernetes could not pull the container image — often a typo'd tag or a registry auth problem", "The cluster is out of memory", "A readiness probe is failing"], correctIndex: 1 }
      }
    ],
    quiz: [
      { id: "q1", questionType: "single", question: "What is the relationship between a Deployment and a Pod?", choices: ["They are the same thing with different names", "A Deployment manages a ReplicaSet, which manages Pods, maintaining the desired replica count", "A Pod manages a Deployment", "Deployments are only used for networking"], correctIndex: 1 },
      { id: "q2", questionType: "single", question: "What problem does a Kubernetes Service solve?", choices: ["It provides a stable name/address that load-balances across Pods, whose own IPs are ephemeral", "It replaces the need for Pods entirely", "It only matters for external traffic, never internal", "It stores application configuration"], correctIndex: 0 },
      { id: "q3", questionType: "single", question: "A pod is stuck in CrashLoopBackOff. What is the most useful next command?", choices: ["kubectl get nodes", "kubectl describe pod <name>, to read its Events section", "kubectl delete namespace", "kubectl top pod"], correctIndex: 1 },
      { id: "q4", questionType: "single", question: "What does `kubectl rollout restart deployment` accomplish that a fixed ConfigMap alone doesn't?", choices: ["It deletes the deployment", "It forces fresh Pods to start, which is what actually picks up the updated ConfigMap", "It changes the container image automatically", "It is identical to kubectl scale"], correctIndex: 1 }
    ]
  },
  // Same real content as the seeded 'microsoft-azure-fundamentals' course
  // in migration 0085.
  {
    id: "local-microsoft-azure-fundamentals",
    slug: "microsoft-azure-fundamentals",
    title: "Microsoft Azure Fundamentals",
    description: "How Azure actually organizes resources and identity — management groups, subscriptions, resource groups, and role-based access control — plus the core services (VMs, App Service, storage, virtual networks) every Azure workload is built from.",
    level: "intermediate",
    estimatedMinutes: 20,
    category: "cloud",
    track: "academy",
    freeTier: false,
    modules: [
      { id: "m1", title: "Azure Structure & Identity" },
      { id: "m2", title: "Core Azure Services" }
    ],
    lessons: [
      {
        id: "l1",
        moduleId: "m1",
        title: "Subscriptions, resource groups, and Azure Resource Manager",
        body: "Azure organizes everything under a hierarchy: management groups (optional, for applying policy across many subscriptions at once) contain subscriptions (the billing and access-control boundary), which contain resource groups (a logical container for resources that share a lifecycle — you typically delete a resource group to delete everything inside it together). Every operation in Azure, whether from the Portal, CLI, PowerShell, or an ARM/Bicep template, goes through Azure Resource Manager (ARM), the single control-plane API that authenticates the request, checks RBAC permissions, and routes it to the right resource provider. This is why infrastructure-as-code in Azure (ARM templates, Bicep, or Terraform's azurerm provider) all produce identical results — they're just different syntaxes for the same underlying ARM API calls.",
        keyTakeaway: "A resource group is a lifecycle boundary — deleting it deletes everything inside it together, which is why deployments are usually scoped to one.",
        check: { question: "What happens when you delete a resource group in Azure?", choices: ["Only the resource group's tags are removed", "Every resource inside it is deleted along with it", "Resources are moved to a default group", "Nothing, resource groups are permanent"], correctIndex: 1 }
      },
      {
        id: "l2",
        moduleId: "m1",
        title: "Microsoft Entra ID and role-based access control",
        body: "Microsoft Entra ID (formerly Azure Active Directory) is Azure's identity service — every user, service principal (an application's own identity), and managed identity (an identity Azure automatically manages for a resource, so you never handle its credentials directly) authenticates through it. Access to actually do things with resources is governed separately by Azure RBAC: a role assignment binds a security principal (a user, group, or service principal) to a role definition (like Reader, Contributor, or Owner, or a custom role) at a scope (a management group, subscription, resource group, or single resource). RBAC is additive only — you grant permissions, you can't explicitly deny them the way a firewall rule blocks traffic — and permissions granted at a higher scope always inherit down to everything beneath it. Least privilege means picking the narrowest role at the narrowest scope that still lets someone do their job — Contributor on one resource group instead of Owner on the whole subscription.",
        keyTakeaway: "RBAC in Azure is additive only, and permissions granted at a higher scope automatically inherit down.",
        check: { question: "A user is granted Contributor at the subscription level. What does that mean for a specific resource group underneath it?", choices: ["They get no access unless granted separately", "They inherit Contributor access there too", "They only get Reader access there", "Subscription-level roles don't inherit"], correctIndex: 1 }
      },
      {
        id: "l3",
        moduleId: "m2",
        title: "Compute: VMs, scale sets, and App Service",
        body: "An Azure Virtual Machine is IaaS — you pick a size (which fixes its vCPU/RAM/disk throughput), an OS image, and you're responsible for patching and managing everything above the hypervisor, the same as EC2 on AWS. A Virtual Machine Scale Set (VMSS) manages a group of identical VMs as one unit, automatically adding or removing instances based on an autoscale rule (like CPU percentage) — the same pattern as an AWS Auto Scaling Group. Azure App Service is PaaS: you deploy code (a container, or directly from a Git repo) and Azure handles the OS, runtime patching, and the scaling settings you configure — no VM to manage at all. Choosing between them mostly comes down to how much control you actually need: App Service for a standard web app or API, VMs/VMSS when you need OS-level control or software that doesn't fit a PaaS runtime.",
        keyTakeaway: "App Service trades VM-level control for zero OS management — the same IaaS-vs-PaaS tradeoff as any cloud provider, just with Azure's own names for it.",
        check: { question: "What is the main difference between a VM Scale Set and Azure App Service?", choices: ["They are identical services", "A VMSS manages a group of full VMs you still patch yourself; App Service is PaaS with no OS to manage", "App Service only runs static websites", "VMSS is only for databases"], correctIndex: 1 }
      },
      {
        id: "l4",
        moduleId: "m2",
        title: "Storage, virtual networks, and keeping costs in check",
        body: "Azure Storage accounts hold multiple types side by side: Blob storage (unstructured files over HTTP/HTTPS, like AWS S3), Azure Files (a fully managed SMB/NFS file share you can mount like a network drive), and managed Disks (block storage attached to a single VM). A Virtual Network (VNet) is your own isolated network in Azure, split into subnets; a Network Security Group (NSG) is a set of allow/deny rules, by source/destination IP, port, and protocol, attached to a subnet or network interface, functioning as Azure's stateful firewall layer. Azure Monitor collects metrics and logs across all of this, and Cost Management (Cost Analysis plus budgets with alerts) is the tool for catching a runaway bill before the invoice arrives — a budget alert firing on an unexpected spike is usually the first sign a VM was left running, or a scale set's autoscale rule was misconfigured.",
        keyTakeaway: "An NSG's allow/deny rules by IP/port/protocol are Azure's core firewall layer — most \"can't connect\" issues on a VNet trace back to one.",
        check: { question: "What does a Network Security Group (NSG) control in Azure?", choices: ["Billing alerts", "Allow/deny traffic rules by IP, port, and protocol for a subnet or NIC", "Which OS a VM runs", "Storage account replication settings"], correctIndex: 1 }
      }
    ],
    quiz: [
      { id: "q1", questionType: "single", question: "What is the correct order of Azure's organizational hierarchy, from broadest to narrowest?", choices: ["Resource group > subscription > management group", "Management group > subscription > resource group", "Subscription > management group > resource group", "They have no hierarchy"], correctIndex: 1 },
      { id: "q2", questionType: "single", question: "Azure RBAC role assignments work by:", choices: ["Explicitly denying specific users", "Granting a role to a principal at a scope, which is additive and inherits downward", "Blocking all access by default with no way to grant it", "Only applying to a single resource, never a resource group"], correctIndex: 1 },
      { id: "q3", questionType: "single", question: "You need to run a legacy application that requires specific OS-level configuration Azure App Service doesn't support. What's the right compute choice?", choices: ["Azure App Service anyway", "A Virtual Machine", "Cost Management", "Microsoft Entra ID"], correctIndex: 1 },
      { id: "q4", questionType: "single", question: "What is the primary purpose of Azure Cost Management budgets and alerts?", choices: ["To automatically delete unused resources", "To catch unexpected spending before the invoice arrives", "To enforce RBAC roles", "To configure NSG rules"], correctIndex: 1 }
    ]
  },
  // Same real content as the seeded 'devops-cicd-intermediate' course in
  // migration 0088 — the second level of the DevOps & CI/CD Engineer
  // learning path, following the existing Introduction course above.
  {
    id: "local-devops-cicd-intermediate",
    slug: "devops-cicd-intermediate",
    title: "DevOps & CI/CD: Intermediate",
    description: "Real pipeline architecture, Jenkins and GitHub Actions in practice, Docker inside a pipeline, Terraform fundamentals, and the secrets/supply-chain risks and rollback strategies every production pipeline has to handle.",
    level: "intermediate",
    estimatedMinutes: 260,
    category: "devops",
    track: "academy",
    freeTier: false,
    capstone: {
      title: "Build a real CI/CD pipeline for a containerized application",
      description: "Take an application through a real pipeline end to end — build, test, containerize, and produce a deployable, traceable artifact, with a rollback plan decided before you need it.",
      requirements: [
        "Write a real GitHub Actions workflow (or Jenkinsfile) that runs on every push: checkout, install dependencies, run tests",
        "Add a stage that builds a Docker image and tags it with the git commit SHA, not latest",
        "Push the built image to a registry using a secret stored in the platform's real secrets store, never hardcoded",
        "Pin any third-party actions/plugins used to a specific version or commit, not a floating branch",
        "Add a scan step (even a basic one) before the push step, so a vulnerable image fails the build",
        "Write a one-page rollback plan: which strategy (revert-and-redeploy, redeploy-previous-artifact, or feature flag) you'd use and why, for this specific app"
      ],
      deliverable: "A working pipeline file (Actions workflow or Jenkinsfile) you can point to and explain stage by stage, plus your rollback plan. Self-assessed against the checklist above."
    },
    modules: [
      {
        id: "m1", title: "CI/CD Pipeline Architecture",
        interviewQuestions: [
          { question: "What does \"pipeline as code\" actually mean, and why does it matter?", answer: "The pipeline definition itself lives in a file checked into the repository, versioned and reviewed the same way application code is — instead of being configured by clicking through a UI, which nobody reviews and which drifts silently between environments." },
          { question: "Why do PR pipelines typically run a smaller set of checks than a merge-to-main pipeline?", answer: "PR pipelines optimize for fast feedback so a developer isn't blocked waiting — the full, slower suite (broader tests, deploy stages) runs on merge, where correctness matters more than speed." }
        ]
      },
      {
        id: "m2", title: "Jenkins in Practice",
        interviewQuestions: [
          { question: "What is the practical difference between declarative and scripted Jenkins pipeline syntax?", answer: "Declarative is structured and constrained (easier to read, review, and validate) — scripted is full Groovy, more flexible but harder to review and more error-prone. Most teams default to declarative and only reach for scripted for edge cases it can't express." },
          { question: "Why shouldn't production builds run directly on the Jenkins controller?", answer: "The controller runs Jenkins itself — a build with a runaway process or a compromised dependency can take down the entire Jenkins instance, not just its own job. Agents isolate build workloads from the system that schedules and manages them." }
        ]
      },
      {
        id: "m3", title: "GitHub Actions in Practice",
        interviewQuestions: [
          { question: "By default, do jobs in a GitHub Actions workflow run in parallel or in sequence?", answer: "Parallel, unless a job declares needs: on another job — steps within a single job run sequentially, but separate jobs run at the same time by default." },
          { question: "When would you choose a self-hosted runner over a GitHub-hosted one?", answer: "When the build needs access to a private network/internal resources, specific hardware (GPU, particular architecture), or persistent local caching that a fresh, ephemeral hosted runner can't provide." }
        ]
      },
      {
        id: "m4", title: "Docker Integration in Pipelines",
        interviewQuestions: [
          { question: "Why tag pipeline-built images with the git commit SHA?", answer: "It lets you trace exactly which code produced any running container — tagging only latest throws that traceability away and can silently deploy different code than intended." },
          { question: "What is a matrix build and when would you use one?", answer: "Running the same job across multiple combinations (e.g. OS versions, architectures, language versions) in parallel — used when you need to verify or build for more than one target without writing near-duplicate pipeline definitions." }
        ]
      },
      {
        id: "m5", title: "Infrastructure as Code Fundamentals",
        interviewQuestions: [
          { question: "What is the difference between terraform plan and terraform apply?", answer: "plan previews what would change without touching real infrastructure at all; apply actually makes the change. The plan-before-apply discipline is Terraform's core safety mechanism against surprise changes." },
          { question: "Why is losing a Terraform state file dangerous?", answer: "State maps your configuration to already-created real resources. Without it, Terraform no longer knows what it manages, risking orphaned resources it can no longer track or destructive drift the next time someone applies." }
        ]
      },
      {
        id: "m6", title: "Pipeline Security & Secrets Management",
        interviewQuestions: [
          { question: "What is OIDC federation and why is it considered better than storing long-lived cloud credentials as CI secrets?", answer: "OIDC lets the CI platform request short-lived, scoped credentials directly from the cloud provider at run time, instead of storing a static long-lived access key as a secret. A short-lived token that expires in minutes can't be stolen and reused the way a static key sitting in secrets storage can." },
          { question: "What is dependency confusion, in the context of a build pipeline?", answer: "An attacker publishes a public package with the same name as an internal private one; if the build is misconfigured to check public registries first, it silently pulls the attacker's malicious package instead of the real internal one." }
        ]
      },
      {
        id: "m7", title: "Monitoring, Troubleshooting & Rollbacks",
        interviewQuestions: [
          { question: "How do you tell a flaky test from a real regression in a failed pipeline run?", answer: "A flaky test fails intermittently and often passes on re-run with no code change (usually infra/timing related); a real regression fails deterministically because of an actual code change. Re-running a failure without checking which one it is risks masking a real bug." },
          { question: "What are the three main rollback strategies, and how do you choose between them?", answer: "Revert-and-redeploy (safest, slowest — git revert then rerun the pipeline), redeploy-previous-artifact (fast, requires retained immutable build artifacts), and feature flags (fastest, but only works if the flag was built in ahead of time). The right choice depends on how the original change was shipped, decided before an incident, not during one." }
        ]
      }
    ],
    lessons: [
      {
        id: "l1", moduleId: "m1",
        title: "Anatomy of a real pipeline",
        body: "A real pipeline is a sequence of stages: checkout, build, test, scan, package, deploy — each one a gate the change has to pass before the next runs. \"Pipeline as code\" means this sequence is defined in a file (a Jenkinsfile, a GitHub Actions workflow, a GitLab CI YAML) that lives in the repository itself, versioned and reviewed the same way application code is, instead of clicked together in a UI that nobody reviews and that quietly drifts between environments. This is also why a change to the pipeline definition goes through the same pull-request review as any other code change — the deployment process is a first-class, auditable part of the codebase, not a separate, informal thing someone remembers how to configure.",
        keyTakeaway: "Pipeline-as-code means the deployment process itself is versioned and reviewed like any other code change — not configured by hand in a UI nobody reviews.",
        check: { question: "What does \"pipeline as code\" mean?", choices: ["The pipeline only runs application code, nothing else", "The pipeline definition lives in a file in the repo, versioned and reviewed like any other code", "Pipelines are written exclusively in a general-purpose programming language", "It refers to auto-generating code from the pipeline"], correctIndex: 1 }
      },
      {
        id: "l2", moduleId: "m1",
        title: "Triggers and pipeline design",
        body: "Different events should trigger different pipelines. A pull request typically runs a fast subset of checks — lint, unit tests, maybe a build — optimized for quick feedback so a developer isn't blocked waiting. A merge to the main branch runs the full suite: broader integration tests, security scans, and the actual deploy stages, since correctness now matters more than speed. Well-designed pipelines also use fan-out/fan-in: several independent test suites run in parallel (fan-out) and the deploy stage only starts once all of them report success (fan-in) — this cuts total pipeline time dramatically compared to running everything sequentially, without sacrificing the requirement that everything actually passes before deploying.",
        keyTakeaway: "Match trigger to purpose — PR pipelines optimize for fast feedback, merge pipelines optimize for correctness before deploy.",
        check: { question: "Why do PR pipelines typically run fewer checks than a merge-to-main pipeline?", choices: ["PRs are less important than merges", "PR pipelines optimize for fast feedback; the full suite runs on merge where correctness matters more", "GitHub limits how many checks a PR can run", "There is no real difference"], correctIndex: 1 }
      },
      {
        id: "l3", moduleId: "m2",
        title: "The Jenkinsfile and pipeline syntax",
        body: "A Jenkinsfile can be written in declarative syntax (a structured, constrained format — stages, steps, an agent directive for where it runs, and a post block for cleanup/notifications that run regardless of outcome) or scripted syntax (full Groovy, far more flexible but harder to read and review). Declarative is the default choice for most teams precisely because its structure is easier to validate and reason about; scripted is reserved for logic declarative genuinely can't express. The agent directive matters more than it looks — it decides which machine actually executes the stage, which is the foundation of build isolation covered in the next lesson.",
        keyTakeaway: "Declarative Jenkins syntax trades some flexibility for structure that's easier to read, review, and validate — reach for scripted only when declarative genuinely can't express what you need.",
        check: { question: "What is the practical tradeoff between declarative and scripted Jenkins pipelines?", choices: ["Scripted is always faster to execute", "Declarative is more structured and easier to review; scripted is more flexible but harder to read", "Declarative can only run on Linux agents", "There is no real difference between them"], correctIndex: 1 },
        lab: {
          objective: "Get a real declarative Jenkins pipeline running end to end.",
          environment: "A local or existing Jenkins instance",
          tools: ["Jenkins", "A small sample repository"],
          steps: [
            "Create a Jenkinsfile with pipeline { agent any; stages { stage('Build'){ steps { echo 'Building' } } stage('Test'){ steps { echo 'Testing' } } } }",
            "Create a new Pipeline job in Jenkins pointing at this Jenkinsfile",
            "Run the build and watch the stage view populate as each stage completes",
            "Add a post { always { echo 'Done' } } block and confirm it runs even if you make a stage fail on purpose"
          ],
          troubleshooting: "Job stuck in queue → no agent is available/connected; check the agent's status. Stage silently skipped → check for a missing when condition unintentionally excluding it.",
          challenge: "Add a stage that only runs when the branch is main, using a when { branch 'main' } condition."
        }
      },
      {
        id: "l4", moduleId: "m2",
        title: "Jenkins agents, executors, and plugins",
        body: "The Jenkins controller schedules and manages jobs; agents are the machines that actually execute a build's steps. Running production builds directly on the controller is a real anti-pattern — a runaway process or a compromised dependency in a build can take down the entire Jenkins instance, not just its own job, since the controller also runs everything else. Executors set how many builds an agent can run in parallel — too few and jobs queue up waiting; too many and builds start starving each other for CPU/memory on the same box. Jenkins' plugin ecosystem is a double edge: it covers almost any integration you'd want, but every installed plugin is also code you're trusting and a real maintenance/security surface — auditing and removing unused plugins periodically is a genuine, not optional, part of running Jenkins.",
        keyTakeaway: "Never run production builds on the Jenkins controller itself — a compromised or runaway build should only be able to take down an agent, not the whole instance.",
        check: { question: "Why shouldn't production builds run directly on the Jenkins controller?", choices: ["It's slower than an agent", "A bad build could take down the entire Jenkins instance, not just its own job", "Controllers can't run Groovy scripts", "There is no real difference"], correctIndex: 1 }
      },
      {
        id: "l5", moduleId: "m3",
        title: "Workflow YAML: jobs, steps, and runners",
        body: "A GitHub Actions workflow lives in .github/workflows/*.yml. Jobs run in parallel by default — add needs: another-job to force one to wait for another to finish first. Steps within a single job run sequentially, top to bottom. A runner is the machine executing the job: GitHub-hosted runners are fresh, ephemeral virtual machines spun up per run (no leftover state between runs, no maintenance burden, but no access to your private network); self-hosted runners are your own persistent infrastructure, needed when a build requires internal network access, specific hardware, or heavier local caching a fresh hosted runner can't provide.",
        keyTakeaway: "GitHub-hosted runners are fresh and maintenance-free but isolated from your network — self-hosted runners trade that isolation for persistent access and caching.",
        check: { question: "By default, do jobs in a GitHub Actions workflow run in parallel or sequentially?", choices: ["Sequentially, always", "Parallel by default, unless a job declares needs on another job", "It depends on the runner OS", "Only one job can exist per workflow"], correctIndex: 1 },
        lab: {
          objective: "Write and run a real GitHub Actions workflow that builds and tests a small app on every push.",
          environment: "A GitHub repository you can push to",
          tools: ["GitHub Actions"],
          steps: [
            "Create .github/workflows/ci.yml with: on: push, a job with steps for actions/checkout, setting up a runtime, and running your test command",
            "Push a commit and watch the workflow run in the Actions tab",
            "Intentionally break a test, push again, and confirm the workflow fails clearly",
            "Fix it and confirm the workflow goes green again"
          ],
          troubleshooting: "Workflow doesn't trigger at all → check the on: block and that the file is really under .github/workflows/. Step fails with a missing command → confirm the runtime/setup step actually matches your project.",
          challenge: "Add needs: to a second job so it only runs after the first job succeeds."
        }
      },
      {
        id: "l6", moduleId: "m3",
        title: "Reusable workflows, composite actions, and secrets",
        body: "Copy-pasting the same steps across many workflow files is exactly the kind of duplication CI/CD is supposed to eliminate elsewhere. Reusable workflows (called with workflow_call) and composite actions solve this by letting one definition be called from many workflows, with inputs for whatever varies between callers. secrets.* values are automatically masked in logs — they show up as *** even if a step accidentally prints them — but that masking only protects the log output; anyone who can edit the workflow file itself can still reference and potentially exfiltrate a secret in a new step. This is why write access to .github/workflows deserves the same scrutiny as write access to production infrastructure — it effectively is.",
        keyTakeaway: "Secret masking protects log output, not the secret itself — anyone who can edit the workflow file can still reference it, so treat that write access like production access.",
        check: { question: "What actually protects a workflow secret from being exposed?", choices: ["Masking in logs alone is fully sufficient", "Masking hides it from logs, but anyone who can edit the workflow file can still reference and potentially exfiltrate it", "Secrets are encrypted so no one can ever use them", "GitHub deletes secrets after each run"], correctIndex: 1 }
      },
      {
        id: "l7", moduleId: "m4",
        title: "Building and tagging images in CI",
        body: "Building a Docker image inside a pipeline is the same docker build under the hood, just run by a CI job instead of a laptop — with two things that matter more at CI scale. First, layer caching: without it, every run rebuilds every layer from scratch; BuildKit cache mounts (or a registry-based cache) let a pipeline reuse unchanged layers between runs, the same speedup covered in the Docker course's Dockerfile-ordering lesson, just wired into CI instead of a local machine. Second, tagging: tag every CI-built image with the git commit SHA (never just latest), so any running container can be traced back to the exact code that produced it — the same discipline covered in the Docker course's registries lesson, now the pipeline's job to enforce automatically instead of a person remembering to do it. Matrix builds run the same build across multiple targets (OS, architecture) in parallel when more than one is genuinely needed.",
        keyTakeaway: "Tag every CI-built image with the git commit SHA, not latest — it's the difference between tracing a production incident back to exact code and not being able to.",
        check: { question: "Why tag CI-built Docker images with the git commit SHA?", choices: ["It makes the build faster", "It lets you trace exactly which code produced any running container", "It is required by all registries", "It reduces the image size"], correctIndex: 1 },
        lab: {
          objective: "Build and tag a Docker image as part of a CI workflow, the way a real pipeline would.",
          environment: "A GitHub repository with a Dockerfile",
          tools: ["GitHub Actions", "Docker"],
          steps: [
            "Add a step using docker/build-push-action (or a raw docker build command) to your workflow",
            "Tag the image with ${{ github.sha }} instead of latest",
            "Run the workflow and confirm the built image tag matches the commit that triggered it",
            "(Optional) Push to a registry you control, using a real secret for credentials"
          ],
          troubleshooting: "Build succeeds locally but fails in CI → check for missing build context files not committed to the repo, or a Dockerfile assuming local files that only exist on your machine.",
          challenge: "Add a second tag alongside the SHA tag — e.g. a branch name — so the image is reachable both ways."
        }
      },
      {
        id: "l8", moduleId: "m5",
        title: "Terraform basics: providers, resources, and state",
        body: "Terraform describes infrastructure in HCL: a provider block (aws, azurerm, google) tells it which API to talk to, and resource blocks describe the actual things you want to exist — a VM, a storage bucket, a network. terraform plan previews exactly what would change without touching any real infrastructure at all; terraform apply actually makes the change. This plan-before-apply discipline is Terraform's core safety mechanism — you see precisely what will be created, changed, or destroyed before it happens, catching a typo'd resource or an accidental destroy before it becomes a real incident instead of after.",
        keyTakeaway: "Always read the plan output before applying — it's the one guaranteed chance to catch a mistake before it touches real infrastructure.",
        check: { question: "What is the core safety mechanism terraform plan provides?", choices: ["It automatically fixes configuration errors", "It previews exactly what would change before anything real is touched", "It encrypts the state file", "It replaces the need for version control"], correctIndex: 1 }
      },
      {
        id: "l9", moduleId: "m5",
        title: "Terraform state and why it's dangerous to lose",
        body: "Terraform's state file maps your configuration to the real, already-created resources it manages — it's how Terraform knows an aws_instance block in your code corresponds to a specific, already-running server rather than one it should create fresh. Losing or corrupting that file means Terraform no longer knows what it's actually managing: it might try to recreate resources that already exist, or lose track of ones it should be managing entirely. Remote state (an S3 bucket with DynamoDB locking, or Terraform Cloud) solves two problems at once: the file survives even if a laptop dies, and locking prevents two people from applying at the same time and corrupting it through a race condition. The state file can also contain sensitive values (resource IDs, sometimes secrets) — it should never be committed to git.",
        keyTakeaway: "Remote state with locking solves both loss risk (survives a laptop dying) and team-concurrency risk (prevents two simultaneous applies from corrupting it).",
        check: { question: "Why is a Terraform state file dangerous to lose?", choices: ["It only affects billing reports", "Terraform no longer knows what real resources it manages, risking orphaned resources or destructive drift", "It just needs to be regenerated with one command, no real risk", "State files are automatically backed up by every provider"], correctIndex: 1 },
        lab: {
          objective: "Apply a small, real Terraform configuration and inspect what state actually looks like.",
          environment: "Terraform CLI installed, any provider account (or a local-only provider for a filesystem resource)",
          tools: ["Terraform CLI"],
          steps: [
            "Write a minimal main.tf with a provider block and one simple resource",
            "Run terraform init, then terraform plan and read the output carefully",
            "Run terraform apply and confirm the resource was actually created",
            "Open terraform.tfstate in a text editor and find the resource you just created inside it",
            "Run terraform destroy to clean up"
          ],
          troubleshooting: "plan shows resources you didn't expect to change → something already exists outside Terraform's knowledge (manual change, or state drift) — this is exactly why state matters.",
          challenge: "Explain, in your own words, why terraform.tfstate should never be committed to a public git repository."
        }
      },
      {
        id: "l10", moduleId: "m6",
        title: "Secrets in CI, done right",
        body: "A secret hardcoded in a pipeline file is not private, even in a \"private\" repository — it can leak through build logs, forks, or anyone with read access to the repo's history. The real fix is the platform's actual secrets store (GitHub Secrets, Jenkins Credentials), never a plain environment variable checked into the pipeline file itself. The modern best practice goes further: OIDC federation lets the CI platform request short-lived, scoped credentials directly from the cloud provider (AWS, Azure, GCP) at run time, instead of storing a long-lived access key as a secret at all. A short-lived token that expires in minutes is far less dangerous if leaked than a static key sitting in secrets storage indefinitely, waiting to be stolen and reused later.",
        keyTakeaway: "OIDC federation's real advantage is that a stolen short-lived token expires in minutes — a stolen long-lived static key doesn't.",
        check: { question: "What is the main advantage of OIDC federation over storing a long-lived cloud access key as a CI secret?", choices: ["It's easier to configure", "A short-lived token requested at run time can't be stolen and reused the way a static key can", "It removes the need for any authentication at all", "It only works with GitHub Actions"], correctIndex: 1 }
      },
      {
        id: "l11", moduleId: "m6",
        title: "Supply-chain risk in pipelines",
        body: "Using a third-party action or plugin pinned to a floating reference (uses: someaction@main instead of a specific version tag or commit SHA) means the code that actually runs inside your pipeline can change without your review — if that action is compromised upstream, the next run silently executes the attacker's code with whatever access your pipeline has. Pinning to an exact commit SHA (or at minimum a specific released version) means an update to that dependency is something you have to deliberately pull in, not something that happens to you automatically. Dependency confusion is a related but distinct risk: an attacker publishes a public package with the same name as an internal private one, and if the build resolves public registries before internal ones, it silently pulls the attacker's malicious package instead of the real internal dependency.",
        keyTakeaway: "Pin third-party actions and plugins to an exact version or commit — a floating reference means their code can change without your review.",
        check: { question: "Why pin a third-party GitHub Action to a specific commit SHA instead of @main?", choices: ["It makes the workflow run faster", "@main can change at any time without your review — pinning means an update is something you deliberately pull in", "SHA pinning is required by GitHub", "It has no real security benefit"], correctIndex: 1 }
      },
      {
        id: "l12", moduleId: "m7",
        title: "Debugging a failed pipeline run, systematically",
        body: "Read the actual failing step's log output first — not just the red X, the real error a few lines up from where the job gave up. Reproduce the failure locally when possible before iterating inside CI; a local reproduction loop is minutes, a CI iteration loop is often much slower per attempt. The most important early judgment call is distinguishing a flaky test (intermittent, often infra or timing related, frequently passes on a re-run with zero code changes) from a real regression (deterministic, caused by an actual code change, will keep failing until it's fixed) — re-running a failure without knowing which one it is risks either wasting time chasing a phantom or, worse, masking a real bug by assuming it was \"just flaky.\"",
        keyTakeaway: "Work out whether a failure is flaky or a real regression before deciding to just re-run it — re-running blindly risks masking a genuine bug.",
        check: { question: "A pipeline step fails. What should you check first?", choices: ["Immediately re-run the whole pipeline", "Read the actual failing step's log output for the real error", "Restart the CI server", "Disable the failing test permanently"], correctIndex: 1 },
        lab: {
          objective: "Practice diagnosing a real failed pipeline run using the log output rather than guessing.",
          environment: "Any CI system (GitHub Actions or Jenkins) with a sample project",
          tools: ["GitHub Actions or Jenkins"],
          steps: [
            "Deliberately break a test or a build step in a sample project",
            "Push/run the pipeline and let it fail",
            "Open the failing step's full log, not just the summary, and find the real underlying error",
            "Fix the actual cause and confirm the pipeline passes"
          ],
          troubleshooting: "The summary view hides the real error → most CI systems collapse long output by default; expand the failing step fully rather than trusting the one-line summary.",
          challenge: "Re-run the same failing pipeline twice without changing anything. If it fails identically both times, explain why that rules out 'flaky.'"
        }
      },
      {
        id: "l13", moduleId: "m7",
        title: "Rollback strategies",
        body: "Revert-and-redeploy (git revert the change, then run the pipeline again) is the safest option and the slowest, since it goes through the full pipeline again. Redeploy-previous-artifact (re-deploy the last known-good build output directly) is much faster, but only works if build artifacts are actually retained and immutable — if the previous artifact was deleted or overwritten, this option doesn't exist when you need it. Feature flags — turning off the new behavior at runtime without a deploy at all — are the fastest of all three, but only work if the flag was built into the code ahead of time; you can't retrofit a flag during an active incident. The right strategy depends entirely on how the original change was shipped, which is a decision to make before an incident, not during one.",
        keyTakeaway: "Feature flags are the fastest rollback, but only if built in ahead of time — you cannot retrofit one during an active incident.",
        check: { question: "Which rollback strategy requires the capability to have been built in ahead of time, before any incident?", choices: ["Revert-and-redeploy", "Redeploy-previous-artifact", "Feature flags", "All three require no advance preparation"], correctIndex: 2 }
      }
    ],
    quiz: [
      { id: "q1", questionType: "single", question: "What does \"pipeline as code\" mean?", choices: ["Pipelines can only build code, nothing else", "The pipeline definition lives in a file in the repo, versioned and reviewed like any other code", "Pipelines are written in a general-purpose language exclusively", "It means auto-generating application code"], correctIndex: 1 },
      { id: "q2", questionType: "single", question: "What is the practical tradeoff between declarative and scripted Jenkins pipelines?", choices: ["Scripted always runs faster", "Declarative is more structured and easier to review; scripted is more flexible but harder to read", "Declarative only supports Linux agents", "There is no real difference"], correctIndex: 1 },
      { id: "q3", questionType: "single", question: "By default, how do jobs in a GitHub Actions workflow run relative to each other?", choices: ["Always sequentially", "In parallel, unless a job declares needs on another job", "Only one job is allowed per workflow", "It depends on the repository size"], correctIndex: 1 },
      { id: "q4", questionType: "single", question: "Why tag CI-built Docker images with the git commit SHA?", choices: ["It makes builds run faster", "It lets you trace exactly which code produced any running container", "It is required by every registry", "It shrinks the image size"], correctIndex: 1 },
      { id: "q5", questionType: "single", question: "What does terraform plan actually do?", choices: ["Applies the change immediately", "Previews exactly what would change without touching real infrastructure", "Deletes the state file", "Only works after apply has already run"], correctIndex: 1 },
      { id: "q6", questionType: "single", question: "Why is losing a Terraform state file dangerous?", choices: ["It only affects cost reports", "Terraform no longer knows what real resources it manages, risking orphaned resources or destructive drift", "It regenerates automatically with no risk", "State is only used for local testing"], correctIndex: 1 },
      { id: "q7", questionType: "single", question: "What is the main advantage of OIDC federation over a long-lived cloud access key stored as a CI secret?", choices: ["Easier setup only", "A short-lived token requested at run time can't be stolen and reused the way a static key can", "It removes the need for any authentication", "It only works with one cloud provider"], correctIndex: 1 },
      { id: "q8", questionType: "single", question: "Why pin a third-party CI action to a specific commit SHA instead of a floating branch reference?", choices: ["It makes the pipeline run faster", "A floating reference can change at any time without your review", "SHA pinning is mandated by GitHub", "It has no real security benefit"], correctIndex: 1 },
      { id: "q9", questionType: "multiple", question: "Select every real pipeline security best practice (choose all that apply):", choices: ["Store secrets in the platform's real secrets store, never hardcoded", "Pin third-party actions/plugins to a specific version or commit", "Scan built images for known vulnerabilities before pushing", "Grant the pipeline's service account broad admin access for convenience"], correctIndexes: [0, 1, 2] },
      { id: "q10", questionType: "ordering", question: "Arrange the correct troubleshooting order for a failed pipeline run:", choices: ["Fix the real underlying cause", "Read the failing step's full log output", "Determine if it is flaky or a real regression", "Notice the pipeline failed"], correctOrder: [3, 1, 2, 0] }
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
  "soc": "Security Operations",
  "infrastructure": "Infrastructure",
  "cloud": "Cloud Computing",
  "devops": "DevOps & CI/CD"
};

// Same real grouping as learning_paths/learning_path_courses (migration
// 0088) — local preview mirrors it by referencing local course ids
// directly rather than re-deriving completion state separately.
const LEARNING_PATHS = [
  {
    id: "local-devops-cicd-engineer",
    slug: "devops-cicd-engineer",
    title: "DevOps & CI/CD Engineer Path",
    description: "From why DevOps exists through real pipeline architecture, Jenkins, GitHub Actions, Docker-in-CI, Terraform, and production rollback strategy — the progression to work as a DevOps engineer, not just pass a quiz.",
    track: "academy",
    category: "devops",
    courseIds: ["local-intro-to-devops-and-cicd", "local-devops-cicd-intermediate"],
    levelLabels: ["Introduction", "Intermediate"]
  }
];

export function getLocalLearningPaths(userId) {
  const state = readState(userId);
  return LEARNING_PATHS.map(p => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    track: p.track,
    category: p.category,
    courses: p.courseIds.map((courseId, i) => {
      const course = COURSES.find(c => c.id === courseId);
      if (!course) return null;
      return {
        courseId: course.id,
        slug: course.slug,
        title: course.title,
        levelLabel: p.levelLabels[i],
        sortOrder: i,
        minPlan: course.minPlan ?? (course.freeTier ? "STARTER" : "PROFESSIONAL"),
        estimatedMinutes: course.estimatedMinutes,
        lessonCount: course.lessons.length,
        completed: !!courseState(state, course.id).completedAt
      };
    }).filter(Boolean)
  }));
}

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
    minPlan: c.minPlan ?? (c.freeTier ? "STARTER" : "PROFESSIONAL"),
    track: c.track ?? "security",
    lessonCount: c.lessons.length,
    quizQuestionCount: c.quiz.length,
    capstone: c.capstone ?? null
  }));
}
export function getLocalModules(courseId) {
  const course = COURSES.find(c => c.id === courseId);
  return (course?.modules ?? []).map(m => ({ id: m.id, title: m.title, interviewQuestions: m.interviewQuestions ?? [] }));
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
    check: l.check ? { question: l.check.question, choices: l.check.choices } : null,
    lab: l.lab ?? null
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

  // 'completionist' has only ever meant "finished every CyberSachet
  // security course" — scoped the same way the real my_cybersachet_stats()
  // RPC scopes it, so adding the Academy course above doesn't silently
  // raise the bar for a security-only learner.
  const securityCourses = COURSES.filter(c => (c.track ?? "security") === "security");
  const published = securityCourses.length;
  const completedSecurity = completed.filter(e => (COURSES.find(c => c.id === e.courseId)?.track ?? "security") === "security");
  const hasPerfect = enrollments.some(e => e.quizScore === 100);
  const completionist = published > 0 && completedSecurity.length >= published;
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
