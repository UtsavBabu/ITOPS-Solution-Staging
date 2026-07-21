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
  // course in migration 0078 (also mirrored in data/terminalDemos.js for
  // the practice-terminal demos keyed by these same lesson titles).
  {
    id: "local-docker-and-container-fundamentals",
    slug: "docker-and-container-fundamentals",
    title: "Docker & Container Fundamentals",
    description: "What a container actually is versus a virtual machine, how to build one with a Dockerfile, and the day-to-day Docker commands — including volumes, networking, and docker-compose — every DevOps course after this one assumes you already know.",
    level: "intermediate",
    estimatedMinutes: 22,
    category: "devops",
    track: "academy",
    freeTier: false,
    modules: [
      { id: "m1", title: "Why Containers" },
      { id: "m2", title: "Working With Docker Day to Day" }
    ],
    lessons: [
      {
        id: "l1",
        moduleId: "m1",
        title: "Containers vs. virtual machines",
        body: "A virtual machine virtualizes an entire computer — its own kernel, its own OS, running on top of a hypervisor — which makes it heavy (gigabytes, minutes to boot) but fully isolated. A container shares the host machine's kernel and only packages the application plus its dependencies, making it lightweight (megabytes, starts in seconds) while still isolating the app's filesystem, processes, and network from everything else on the host. The tradeoff: a VM can run a completely different OS than its host; a Linux container needs a Linux kernel underneath (which is why Docker on Mac/Windows quietly runs a small Linux VM to host the containers). For most application deployment, containers win on speed and density — running far more containers than VMs on the same hardware — which is why they became the default unit of deployment for modern applications.",
        keyTakeaway: "Containers share the host kernel and only package the app plus dependencies — lightweight and fast, but not a full separate OS like a VM.",
        check: { question: "What is the key difference between a container and a virtual machine?", choices: ["Containers are always slower to start", "A container shares the host kernel instead of virtualizing a whole OS", "Virtual machines use less disk space", "There is no real difference"], correctIndex: 1 }
      },
      {
        id: "l2",
        moduleId: "m1",
        title: "Images, containers, and the Dockerfile",
        body: "An image is a read-only template — application code, a runtime, libraries, and configuration, all bundled together — and a container is a running instance of that image, the same relationship a class has to an object. A Dockerfile is the recipe that builds an image: FROM picks a base image (like python:3.12 or node:20), COPY adds your application files in, RUN executes setup commands (like installing dependencies) at build time, and CMD defines what runs when a container starts from it. Images are built in layers, and Docker caches each layer — reordering a Dockerfile so rarely-changing steps (like installing dependencies) come before frequently-changing steps (like copying your source code) means most builds only re-run the last layer or two, dramatically speeding up iteration.",
        keyTakeaway: "Order a Dockerfile so rarely-changing steps come first — Docker's layer cache means only the changed layers rebuild.",
        check: { question: "In a Dockerfile, what does the RUN instruction do?", choices: ["Starts the container when it runs", "Executes a command at image build time, like installing dependencies", "Copies files from the host into the image", "Names the resulting image"], correctIndex: 1 }
      },
      {
        id: "l3",
        moduleId: "m2",
        title: "Core Docker commands",
        body: "docker build -t myapp . builds an image from the Dockerfile in the current directory and tags it \"myapp\". docker run -d -p 8080:80 myapp starts a container from that image in the background (-d, detached) and maps port 8080 on the host to port 80 inside the container — without that mapping, the container's port is only reachable from other containers, not the host machine. docker ps lists running containers; add -a to see stopped ones too. docker logs <container> shows a container's output, the first place to look when something crashes right after starting. docker exec -it <container> bash opens an interactive shell inside a running container — useful for poking around, though a container you're regularly shelling into to fix things is usually a sign the image itself needs fixing instead.",
        keyTakeaway: "-p host:container maps a port out to the host — without it, a container's service is only reachable from other containers.",
        check: { question: "What does the -p flag do in `docker run -p 8080:80 myapp`?", choices: ["Names the container", "Maps port 8080 on the host to port 80 inside the container", "Pauses the container after starting", "Pulls a newer image version"], correctIndex: 1 }
      },
      {
        id: "l4",
        moduleId: "m2",
        title: "Volumes, networking, and docker-compose",
        body: "A container's own filesystem is ephemeral — delete the container and any data written inside it is gone. A volume (docker run -v mydata:/var/lib/data) persists data outside the container's lifecycle, on the host, so a database container can be recreated without losing its data. By default, containers on the same Docker network can reach each other by container name — Docker's built-in DNS resolves \"database\" to the right container IP automatically, no hardcoded IPs needed. Running a real application usually means multiple containers (a web app, a database, a cache), and docker-compose.yml describes all of them — images, ports, volumes, and the network linking them — as one file, so `docker compose up` starts the entire stack with one command instead of a series of manual docker run commands typed in the right order.",
        keyTakeaway: "A volume persists data outside a container's lifecycle; docker-compose describes a whole multi-container stack as one file.",
        check: { question: "Why use a volume instead of just writing data inside the container?", choices: ["Volumes are required for a container to start", "A container's own filesystem is deleted with the container — a volume persists data outside it", "Volumes make the image smaller", "There is no difference"], correctIndex: 1 }
      }
    ],
    quiz: [
      { id: "q1", questionType: "single", question: "What is the most fundamental difference between a container and a VM?", choices: ["Containers cost more to run", "A container shares the host kernel instead of virtualizing a full OS", "VMs start faster than containers", "Containers cannot run on Linux"], correctIndex: 1 },
      { id: "q2", questionType: "single", question: "What does a Dockerfile's CMD instruction define?", choices: ["What runs when a container starts from the built image", "The base image to build from", "Which files get copied into the image", "The image's tag name"], correctIndex: 0 },
      { id: "q3", questionType: "single", question: "A container is stopped and removed. What happens to data it wrote to a mounted volume?", choices: ["It is deleted along with the container", "It persists, since a volume lives outside the container's lifecycle", "It moves to a random other container", "Volumes only work for read-only data"], correctIndex: 1 },
      { id: "q4", questionType: "single", question: "What problem does docker-compose solve?", choices: ["It replaces the need for a Dockerfile", "It describes and starts a whole multi-container application from one file instead of many manual commands", "It makes images smaller", "It is required for any container to run"], correctIndex: 1 }
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
