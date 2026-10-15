/* app.jsx — composition + boot + conversation sequencer + derived ClaimFile.
   Brand identity is loaded from brand.config.json at boot and injected as CSS vars.
   The conversation is driven entirely through the transport seam ({events, rich_content}). */
const {
  ChatLog: AChatLog, ChatHeader: AChatHeader, Composer: AComposer, ClaimPanel: AClaimPanel,
  IconGlobe: AGlobe, IconArrowRight: AArrow, IconChevron: AChevron,
  IconReceipt: AReceipt, IconLock: ALock, IconRefresh: ARefresh
} = window;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DEFAULT_DEMO_PACE = 1.35;
const AUTOFLOW = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("autoflow");
const RECORDING_MODE = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("recording");

function demoPace() {
  const configured = Number(window.TALDemoPace);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_DEMO_PACE;
}

function paced(ms) {
  return Math.round(ms * demoPace());
}

function pacedJitter(base, jitter) {
  return paced(base + Math.random() * jitter);
}

/* ---- derive ClaimFile from accumulated cards (CARD-CONTRACT panel model) ---- */
function applyCard(file, card) {
  const f = JSON.parse(JSON.stringify(file));
  const d = card.data;
  switch (card.type) {
    case "identity_verified":
      f.member = { name: d.name, member_no: d.member_no, tier: d.tier };
      break;
    case "claim_type_identified":
      f.claim = Object.assign({}, f.claim, { type: d.claim_type });
      if (d.condition) f.claim.condition = d.condition;
      break;
    case "cover_status":
      f.eligibility = d.result;
      f.policy = { no: d.policy_no, product: d.product, in_force_since: d.in_force_since };
      f.cover = { date_of_event: d.date_of_event, cover_in_force: d.cover_in_force, waiting_period_met: d.waiting_period_met };
      break;
    case "claim_file_opened":
      f.claim = Object.assign({}, f.claim, { ref: d.claim_ref });
      f.documents = d.required_documents.map((r) => ({ id: r.id, label: r.label, status: r.status }));
      break;
    case "document_status": {
      f.documents = (f.documents || []).map((doc) =>
        doc.id === d.doc_id ? Object.assign({}, doc, { status: d.status, issues: d.issues || [] }) : doc);
      // The diagnosis (condition) is only known once the medical certificate is read.
      if (d.diagnosis) f.claim = Object.assign({}, f.claim, { condition: d.diagnosis });
      break;
    }
    case "payment_details":
      f.payment = { account_name: d.account_name, bank: d.bank, account_masked: d.account_masked, name_match: d.name_match };
      break;
    case "benefit_preview":
      f.indicative_benefit = { amount: d.amount, currency: d.currency, caveat: d.caveat };
      break;
    case "claim_lodged":
      f.status = d.status; f.task_id = d.task_id;
      f.lodged = { ref: d.claim_ref, sla: d.sla, next_steps: d.next_steps || [] };
      break;
    default: break;
  }
  return f;
}

function TopNav({ brand, member }) {
  const [logoOk, setLogoOk] = React.useState(true);
  const links = ["Loans", "Accounts", "Payments", "Help"];
  return (
    <header className="topnav">
      <div className="topnav-inner">
        <div className="topnav-brand">
          {logoOk
            ? <img className="topnav-logo" src={brand.logo} alt={brand.logo_alt || brand.name} onError={() => setLogoOk(false)} />
            : <span className="topnav-logo-fallback">{brand.name}</span>}
        </div>
        <nav className="topnav-links">
          {links.map((l, i) => (
            <button key={l} className={"topnav-link" + (i === 0 ? " active" : "")}>{l}</button>
          ))}
        </nav>
        <div className="topnav-spacer"></div>
        <div className="secure-pill">
          <ALock size={14} />
          <span>Secure session</span>
        </div>
        {member && (
          <button className="user-chip">
            <span className="user-av">{member.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}</span>
            <span className="user-meta">
              <b>{member.name}</b>
              <small title={member.account_name || member.tier || "Logged in"}>{member.account_name || member.tier || "Logged in"}</small>
            </span>
            <AChevron size={16} />
          </button>
        )}
      </div>
    </header>
  );
}

/* Welcome rail — sits where the loan panel will later appear (left side). It is
   the front door: who Talia is + the single call to begin. Once the request is
   recognised this whole rail is replaced by the live loan panel. */
function WelcomeIntro({ brand, persona, agent, started, onStart }) {
  const first = persona && persona.name ? persona.name.split(" ")[0] : "there";
  const features = [
    { ic: <AReceipt size={19} />, t: "Facilities & working capital", s: "Increase, amend or review your SME lending" },
    { ic: <ARefresh size={19} />, t: "Reuse first", s: "KYC, UBOs, IDs and prior credit work stay on file" },
    { ic: <ALock size={19} />, t: "Secure session", s: "You're signed in, nothing leaves the bank" }
  ];
  return (
    <div className="welcome">
      <span className="welcome-badge"><AReceipt size={13} /> {brand.name} · BUSINESS BANKING</span>
      <h1 className="welcome-title">
        Hi {first}.<br />
        Meet <span className="accent">{agent.name}</span>,<br />
        your {brand.name} assistant.
      </h1>
      <p className="welcome-lede">
        I'm {agent.name} from {brand.name} business banking. Tell me what you need
        for your facility, contract or working-capital position, and I'll prepare
        the file for credit review.
      </p>
      {started
        ? <div className="welcome-insession"><span className="status-dot live"></span> <span>In session with {agent.name}</span></div>
        : (
          <button className="welcome-cta" onClick={onStart}>
            <span>Talk to {agent.name}</span> <AArrow size={19} />
          </button>
        )}
      <div className="welcome-trust"><AGlobe size={16} /> <span>Trusted by <strong>{(brand && brand.trust_count) || "8.5M+"} {(brand && brand.trust_audience) || "Australians"}</strong> banking with {brand.name}</span></div>
      <div className="welcome-features">
        {features.map((f, i) => (
          <div className="wfeat" key={i}>
            <span className="wfeat-ic">{f.ic}</span>
            <span className="wfeat-text"><b>{f.t}</b><small>{f.s}</small></span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Idle chat body shown before the conversation begins. */
function ChatIdle({ agent, onStart }) {
  return (
    <div className="chat-idle">
      <span className="agent-av lg">{(agent && agent.avatar) || "M"}</span>
      <div className="chat-idle-title">{(agent && agent.name) || "Talia"} is ready when you are</div>
      <div className="chat-idle-sub">
        Start the conversation and I'll guide you through the RCF increase,
        reusing existing bank records and collecting only what's missing.
      </div>
      <button className="welcome-cta sm" onClick={onStart}>
        <span>Talk to {(agent && agent.name) || "Talia"}</span> <AArrow size={17} />
      </button>
    </div>
  );
}

function App({ brand, persona, transport, loanOptions, posOffer, disbursementAccounts }) {
  const [items, setItems] = React.useState([]);
  const [milestones, setMilestones] = React.useState({});
  const confirmationRef = React.useRef(null);
  React.useEffect(() => {
    confirmationRef.current = window.createMilestoneConfirmation(message => {
      setMilestones(previous => ({...previous, [message.reference]: {...previous[message.reference], [message.milestone]: true}}));
      setItems(previous => previous.some(item => item.id === message.id) ? previous : previous.concat(message));
    }, transport.getMilestones);
    return () => confirmationRef.current.dispose();
  }, []);
  const [typing, setTyping] = React.useState(false);
  const [file, setFile] = React.useState(() => ({
    documents: [],
    // Secure session: the member is already authenticated, so we know who they
    // are without a DOB step. Brand bar shows them from the first frame.
    member: persona ? { name: persona.name, member_no: persona.member_no, tier: persona.tier, account_name: persona.account_name } : null
  }));
  const [expected, setExpected] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [fileNames, setFileNames] = React.useState({});
  const [processing, setProcessing] = React.useState({});
  const [uploadErrors, setUploadErrors] = React.useState({});
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [started, setStarted] = React.useState(false);
  const [loanChoice, setLoanChoice] = React.useState(null);
  const [packageChoice, setPackageChoice] = React.useState(null); // POS choice: "added" | "skipped"
  // Progressive build of the claim-file card: each section retrieves/calculates
  // one at a time after the member describes their claim.
  const [stages, setStages] = React.useState({ details: "pending", eligibility: "pending", documents: "pending" });
  const runningRef = React.useRef(false);
  const queueRef = React.useRef([]);
  const autoflowRef = React.useRef({ started: false, sentRequest: false, selectedLoan: false, uploadedDocs: false, confirmedAccount: false });
  const scrollRef = React.useRef(null);
  const bottomRef = React.useRef(null);

  React.useEffect(() => {
    // Coalesce nearby message/typing updates instead of restarting the
    // bottom-follow animation four times while the layout is settling.
    const timer = setTimeout(() => {
      const el = scrollRef.current;
      const bottom = bottomRef.current;
      if (!el || !bottom) return;
      // Keep the existing end-marker alignment without scrolling the page.
      const target = el.scrollTop + bottom.getBoundingClientRect().bottom - el.getBoundingClientRect().bottom;
      el.scrollTo({
        top: Math.max(0, target),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"
      });
    }, 180);
    return () => clearTimeout(timer);
  }, [items, typing]);

  async function step(input) {
    // Show the typing/loading indicator IMMEDIATELY — before the agent round-trip.
    // In live mode getNextTurn() blocks for seconds (send + long-poll), so setting
    // this up front makes the loader appear right away and stay until the reply
    // lands. (In mock mode getNextTurn is instant, so this just precedes the beat.)
    setTyping(true);
    const turn = await transport.getNextTurn(input);
    if (!turn) { setTyping(false); setExpected(transport.expectedInput()); return; }
    const cards = turn.rich_content || [];
    const isRecognition = cards.some((c) => c.type === "claim_type_identified");

    // Kick off the first section's "calculation" while Talia is composing her reply.
    if (isRecognition) setStages((s) => Object.assign({}, s, { details: "loading" }));
    await sleep(pacedJitter(820, 420));
    setTyping(false);
    const evs = turn.events || [];
    // Mount the account selector with its introduction, avoiding a second
    // large layout shift while the message is still entering the chat.
    const inlineAccount = !isRecognition && evs.length
      ? cards.find((card) => card.type === "payment_details") : null;
    for (let i = 0; i < evs.length; i++) {
      const ev = evs[i];
      const additions = [{ kind: "message", speaker: ev.speaker, text: ev.text }];
      if (inlineAccount && i === evs.length - 1) additions.push({ kind: "card", card: inlineAccount });
      setItems((it) => it.concat(additions));
      await sleep(paced(i === evs.length - 1 ? 140 : 520));
    }

    if (isRecognition) {
      // Identify the request, then run a futuristic eligibility check INLINE in
      // the chat before any options appear. The verdict + amount come back live.
      const byType = {};
      cards.forEach((c) => { byType[c.type] = c; });
      // Pre-qualified amount + line are domain-aware (business vs student), not
      // hardcoded \u2014 derived at boot from the active mock's prequal (window.TALPrequal).
      const prequal = window.TALPrequal || "£500,000";
      await sleep(paced(360));
      if (byType.claim_type_identified) setFile((prev) => applyCard(prev, byType.claim_type_identified));
      setStages((s) => Object.assign({}, s, { details: "done", eligibility: "loading" }));
      // Eligibility widget removed on purpose: the customer is only eligible to
      // APPLY at this point, not approved/pre-qualified. Keep a short pause so the
      // panel's eligibility stage still reads naturally before options appear.
      await sleep(paced(700));
      if (byType.cover_status) setFile((prev) => applyCard(prev, byType.cover_status));
      setStages((s) => Object.assign({}, s, { eligibility: "done" }));
      if (byType.claim_file_opened) setFile((prev) => applyCard(prev, byType.claim_file_opened));
      // Agent confirms the result, then presents the finance products. The
      // uploader appears only after the member confirms which loan they want.
      setTyping(true);
      await sleep(paced(960));
      setTyping(false);
      setItems((it) => it.concat([{ kind: "message", speaker: "agent", text: (window.TALEligLine || ("Now, based on the facility history and reusable records, this can go straight into an RCF amendment review. I'll line up the available actions before you confirm the path.")) }]));
      await sleep(paced(420));
      setItems((it) => it.concat([{ kind: "loan_options", id: "loanopts-" + Date.now() }]));
      // Live-mode safety: a buffered agent turn may carry cards beyond the 3
      // recognition ones (e.g. an early document_status). Apply/render them so
      // nothing the live agent emitted is dropped (no-op in mock).
      const recogTypes = { claim_type_identified: 1, cover_status: 1, claim_file_opened: 1 };
      for (let k = 0; k < cards.length; k++) {
        const extra = cards[k];
        if (recogTypes[extra.type]) continue;
        setFile((prev) => applyCard(prev, extra));
        const panelOnly = (extra.type === "document_status" && extra.data.status !== "issue");
        if (!panelOnly) setItems((it) => it.concat([{ kind: "card", card: extra }]));
        await sleep(paced(220));
      }
    } else {
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        setFile((prev) => applyCard(prev, card));
        if (card.type === "document_status") {
          const did = card.data.doc_id;
          setProcessing((p) => { const n = Object.assign({}, p); delete n[did]; return n; });
        }
        // Recognition cards + clean document validations live in the panel only.
        // A document that needs an action (e.g. unsigned) surfaces in the chat so
        // the fix (e-sign) is right where the conversation is.
        const panelOnly = card.type === "claim_type_identified" || card.type === "cover_status"
          || card.type === "claim_file_opened"
          || (card.type === "document_status" && card.data.status !== "issue");
        if (!panelOnly && card !== inlineAccount) setItems((it) => it.concat([{ kind: "card", card: card }]));
        await sleep(paced(260));
      }
      // Right before the request is sent for assessment, offer an optional EFTPOS
      // terminal deal (free first year) that the member can take or skip.
      if (cards.some((c) => c.type === "document_status" && c.data.doc_id === "bank_details" && c.data.status === "validated")) await revealPos();
    }
    cards.forEach(card => confirmationRef.current?.schedule(card));
    const exp = transport.expectedInput();
    setExpected(exp);
    if (exp && exp.kind === "auto") { await sleep(paced(560)); await step(null); }
  }

  async function run(input, userMsg) {
    if (runningRef.current) return;
    runningRef.current = true; setBusy(true);
    if (userMsg) setItems((it) => it.concat([Object.assign({ kind: "message", speaker: "customer" }, userMsg)]));
    try { await step(input); }
    catch (error) {
      setTyping(false);
      setProcessing({});
      setItems((it) => it.concat([{kind:"message",speaker:"agent",text:"The connection was interrupted. Please try again, or reset the demo. Your application has not been confirmed as submitted."}]));
      console.error("Chat failed:", error.message);
    }
    finally {
      runningRef.current = false; setBusy(false);
      setProcessing({}); // safety net: clear any spinner left by an unmatched upload/sign
      pump(); // drain any uploads queued while this turn was running
    }
  }

  // Upload path: show the user's upload, run a futuristic doc-analysis loader in
  // the chat (reading the real PDF), THEN deliver the verdict via the normal turn.
  // Upload path: the upload + its futuristic analysis now play INLINE inside the
  // single documents widget (no separate chat bubble or card). We just flip the
  // doc into a timed "processing" state, then deliver the verdict turn.
  async function runUpload(docId, filename) {
    if (runningRef.current) return;
    runningRef.current = true; setBusy(true);
    if (filename) setFileNames((m) => Object.assign({}, m, { [docId]: filename }));
    setProcessing((p) => Object.assign({}, p, { [docId]: "upload" }));
    try {
      await sleep((window.ANALYSIS_MS || 3600) + paced(220));
      await step("upload:" + docId);
    } catch (error) {
      setTyping(false);
      setItems((it) => it.concat([{kind:"message",speaker:"agent",text:"The document response was interrupted. Please ask me to continue; your uploaded document remains in this session."}]));
      console.error("Document response failed:", error.message);
    } finally {
      runningRef.current = false; setBusy(false);
      setProcessing({});
      pump();
    }
  }

  // Chat upload (single dropzone): the member adds every outstanding file at once.
  // The uploader widget stays put; a Gia-style scan widget opens below it, reads
  // every uploaded file in parallel (status rows flip to "scanning" in place),
  // and only afterwards do the agent's verdicts come back so the chat always
  // alternates turns.
  async function runParallelUploads(jobs) {
    if (runningRef.current || !jobs.length) return;
    runningRef.current = true; setBusy(true);
    setUploadErrors({});
    setFileNames((m) => Object.assign({}, m, Object.fromEntries(jobs.map((j) => [j.docId, j.filename]))));
    setProcessing((p) => Object.assign({}, p, Object.fromEntries(jobs.map((j) => [j.docId, "scan"]))));
    // Add the member's upload bubble + a single dark scan widget that reads every
    // uploaded file side by side. The documents widget stays mounted and its rows
    // flip to "scanning" (driven by processing state).
    setItems((it) => {
      const userMsg = { kind: "message", speaker: "customer", variant: "upload", count: jobs.length, filename: jobs[0].filename };
      const row = { kind: "scan", id: "scan-" + Date.now(), docs: jobs.map((j) => ({ docId: j.docId, filename: j.filename })), done: false };
      return it.concat([userMsg, row]);
    });
    try {
      await sleep((window.ANALYSIS_MS || 3600) + paced(220));
      setItems((it) => it.map((x) => x.kind === "scan" ? Object.assign({}, x, { done: true }) : x));
      // Verdicts must be delivered in claim order (the transport plays turns in sequence).
      for (let i = 0; i < jobs.length; i++) await step("upload:" + jobs[i].docId);
    } catch (error) {
      setTyping(false);
      setItems((it) => it.concat([{kind:"message",speaker:"agent",text:"The document response was interrupted. Please ask me to continue; your uploaded document remains in this session."}]));
      console.error("Document response failed:", error.message);
    } finally {
      runningRef.current = false; setBusy(false);
      setProcessing({});
      pump();
    }
  }

  // Sequential upload queue: lets a single file (sidebar or chat) OR a batch
  // ("upload all" in chat) each play their own analysis, one at a time.
  async function pump() {
    if (runningRef.current) return;
    const job = queueRef.current.shift();
    if (!job) return;
    await runUpload(job.docId, job.filename);
  }
  function enqueueUpload(docId, filename) {
    const doc = (file.documents || []).find((x) => x.id === docId);
    if (!doc || doc.status !== "required") return;
    if (queueRef.current.some((j) => j.docId === docId) || processing[docId]) return;
    setUploadErrors((m) => { const n = Object.assign({}, m); delete n[docId]; return n; });
    setFileNames((m) => Object.assign({}, m, { [docId]: filename }));
    queueRef.current.push({ docId: docId, filename: filename });
    pump();
  }

  // boot: the opening auto turn(s) only play once the member chooses to begin
  // (the welcome rail's chat CTA). Until then the chat sits idle.
  React.useEffect(() => { if (started) run(null, null); /* eslint-disable-next-line */ }, [started]);

  const docLabel = (id) => { const d = (file.documents || []).find((x) => x.id === id); return d ? d.label : "document"; };

  const DEFAULT_UPLOAD_NAME = {
    management_accounts_2024: "Thornfield_2024_Management_Accounts.pdf",
    jlr_contract: "Signed_Contract.pdf"
  };
  function uploadCommand(text) {
    const match = String(text || "").trim().match(/^upload:([a-z0-9_:-]+)$/i);
    if (!match) return false;
    const docId = match[1];
    const doc = (file.documents || []).find((x) => x.id === docId);
    if (!doc || doc.status !== "required") return false;
    const filename = DEFAULT_UPLOAD_NAME[docId] || (docLabel(docId).replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "Document") + ".pdf";
    setItems((it) => it.concat([{ kind: "message", speaker: "customer", variant: "upload", count: 1, filename }]));
    runUpload(docId, filename);
    return true;
  }
  const onSend = (text) => {
    if (uploadCommand(text)) return;
    run(text, { text: text });
  };
  const onUpload = (docId, filename) => enqueueUpload(docId, filename);
  // "Upload all" from the chat: map chosen files to outstanding docs (in the order
  // the claim expects them) and queue each for its own analysis pass.
  const onUploadAll = (filenames) => {
    const list = filenames || [];
    const outstanding = (file.documents || []).filter((d) => d.status === "required");
    const jobs = outstanding.map((d, i) => ({ docId: d.id, filename: list[i] || DEFAULT_UPLOAD_NAME[d.id] || "document.pdf" }));
    runParallelUploads(jobs);
  };
  const onUploadError = (docId, reason) => {
    setUploadErrors((m) => Object.assign({}, m, { [docId]: reason }));
  };
  const onSign = (docId) => {
    setProcessing((p) => Object.assign({}, p, { [docId]: "sign" }));
    run("sign:" + docId, { variant: "sign" });
  };

  // Finance-product selection: records the chosen loan on the file (so the panel
  // reflects it), echoes the choice, and only THEN drops the document uploader.
  async function confirmLoan(opt) {
    if (runningRef.current || loanChoice) return;
    runningRef.current = true; setBusy(true);
    setLoanChoice(opt.id);
    // Relay the pick to the live agent so it lodges THIS chosen finance option
    // deterministically (sent as a clean confirmation at disbursement time by
    // liveTransport's maybeRelayLoanChoice) instead of depending on the user
    // re-typing a fuzzy choice. No-op for the mock transport (no setLoanChoice).
    if (transport && typeof transport.setLoanChoice === "function") transport.setLoanChoice(opt.name);
    setFile((prev) => {
      const f = JSON.parse(JSON.stringify(prev));
      f.claim = Object.assign({}, f.claim, { type: opt.name, condition: opt.amount });
      f.loan = { rate: opt.rate, repayment: opt.repayment, term: opt.term, security: opt.security, fee: opt.fee };
      return f;
    });
    setItems((it) => it.concat([{ kind: "message", speaker: "customer", text: "Let's go with the " + opt.name + "." }]));
    setTyping(true);
    await sleep(paced(820));
    setTyping(false);
    setItems((it) => it.concat([{ kind: "message", speaker: "agent", text: "Great. I've added your choice to the file and reused the existing KYC, UBO declaration, director IDs, 2022/2023 accounts, prior credit memo, and current facility details. I only need two new documents: please upload the 2024 management accounts and the signed contract below." }]));
    setStages((s) => Object.assign({}, s, { documents: "loading" }));
    await sleep(paced(900));
    setStages((s) => Object.assign({}, s, { documents: "done" }));
    await sleep(paced(220));
    setItems((it) => it.concat([{ kind: "uploader", id: "uploader-" + Date.now() }]));
    // Refresh the suggestion chips now the loan is chosen and the uploader is up —
    // confirmLoan doesn't run a transport turn, so re-read expectedInput() so live
    // mode advances its chip from "pick a loan" to the "upload my documents" hint.
    setExpected(transport.expectedInput());
    runningRef.current = false; setBusy(false);
  }

  // Facility account: the member confirms the existing account linked
  // to the RCF. Records the choice on the file and advances the transport.
  function confirmDisbursement(account) {
    if (runningRef.current) return;
    const label = (account.type || "Account") + " · " + (account.masked || "");
    setFile((prev) => {
      const f = JSON.parse(JSON.stringify(prev));
      f.payment = { account_name: account.name, account_type: account.type, bank: (brand && brand.name) || "Barclays", account_masked: account.masked, name_match: true, confirmed: true };
      return f;
    });
    run("confirm disbursement", { variant: "account", label: label });
  }

  // Optional package offer from the source demo. The SME RCF mock path does not
  // emit the legacy bank_details validation, so this does not appear there.
  async function revealPos() {
    await sleep(paced(700));
    setTyping(true);
    await sleep(paced(900));
    setTyping(false);
    setItems((it) => it.concat([{ kind: "message", speaker: "agent", text: "One last thing before I send this for assessment — want to take card payments too? You can add " + ((brand && brand.pos_blurb) || ("a " + ((brand && brand.name) || "Barclays") + " " + ((brand && brand.pos_term) || "card reader"))) + ", free for your first year. Totally optional." }]));
    await sleep(paced(260));
    setItems((it) => it.concat([{ kind: "pos", id: "pos-" + Date.now() }]));
  }

  function confirmPos(take) {
    if (runningRef.current || packageChoice) return;
    setPackageChoice(take ? "added" : "skipped");
    setFile((prev) => {
      const f = JSON.parse(JSON.stringify(prev));
      f.pos = take ? { added: true, name: (posOffer && posOffer.name) || (((brand && brand.name) || "Barclays") + " " + ((brand && brand.pos_term) || "Card Reader")) } : { added: false };
      return f;
    });
    run("submit for assessment", { variant: "pos", label: take ? "Added " + ((brand && brand.pos_term) || "EFTPOS") + " — free for a year" : "Skipped " + ((brand && brand.pos_term) || "EFTPOS") });
  }

  const agent = { name: brand.agent_name, title: brand.agent_title, avatar: brand.agent_avatar };

  // ctx handed to every card renderer + the panel (live doc state + callbacks + affordance hint)
  const ctx = {
    scrollRef,
    milestones,
    agent,
    file,
    expected: expected || {},
    docState: (id) => {
      const d = (file.documents || []).find((x) => x.id === id);
      if (!d) return null;
      return Object.assign({}, d, fileNames[id] ? { filename: fileNames[id] } : {});
    },
    isProcessing: (id) => processing[id] || false,
    uploadError: (id) => uploadErrors[id] || null,
    documents: file.documents || [],
    busy: busy,
    loanOptions: loanOptions || [],
    loanChoice: loanChoice,
    onConfirmLoan: confirmLoan,
    disbursementAccounts: disbursementAccounts || [],
    payment: file.payment || null,
    onConfirmDisbursement: confirmDisbursement,
    posOffer: posOffer || null,
    posChoice: packageChoice,
    onPos: confirmPos,
    onSend: onSend,
    onUpload, onUploadAll, onUploadError, onSign
  };

  // Suggestion chips ("auto-complete") only on the FIRST user message — i.e. the
  // opening greeting before the customer has said anything. Once the customer has
  // sent any message, hide them for the rest of the conversation (both live + mock).
  const userHasSpoken = items.some((it) => it.kind === "message" && it.speaker === "customer");
  const chips = (!userHasSpoken && expected && expected.kind === "reply") ? expected.chips : [];
  const ended = expected && expected.kind === "end";
  // The loan-request panel only exists once the member has chosen to apply and
  // the request has been recognised; before that the chat runs solo and centred.
  const recognised = stages.details !== "pending";
  const hasLoanOptions = items.some((it) => it.kind === "loan_options");
  const hasUploader = items.some((it) => it.kind === "uploader");
  const hasPaymentDetails = items.some((it) => it.kind === "card" && it.card && it.card.type === "payment_details");
  const hasStatusTracker = items.some((it) => it.kind === "card" && it.card && it.card.type === "application_status_tracker");
  const chatQaChecks = {
    started,
    requestSent: userHasSpoken,
    recognised,
    loanOptionsShown: hasLoanOptions,
    loanSelected: Boolean(loanChoice),
    uploaderShown: hasUploader,
    documentsUploaded: (file.documents || []).filter((d) => d.status === "validated").length >= 8,
    accountConfirmed: Boolean(file.payment && file.payment.confirmed),
    statusTrackerShown: hasStatusTracker,
    finished: Boolean(ended)
  };

  React.useEffect(() => {
    if (!AUTOFLOW) return;
    const passed = Object.values(chatQaChecks).every(Boolean);
    window.__NAB_CHAT_QA__ = {
      status: passed ? "passed" : "running",
      checks: chatQaChecks,
      selectedLoan: loanChoice,
      lastExpected: expected ? expected.kind : null
    };
  }, [chatQaChecks, expected, loanChoice]);

  React.useEffect(() => {
    if (!AUTOFLOW || busy) return;
    const auto = autoflowRef.current;
    if (!started && !auto.started) {
      auto.started = true;
      setStarted(true);
      return;
    }
    if (started && expected && expected.kind === "reply" && !userHasSpoken && !auto.sentRequest) {
      auto.sentRequest = true;
      const suggested = expected.chips && expected.chips[0] && expected.chips[0].sends;
      onSend(suggested || "I've just signed a new contract with a major automotive manufacturer and need a £300,000 increase to my credit facility to fund it");
      return;
    }
    if (hasLoanOptions && !loanChoice && !auto.selectedLoan && loanOptions && loanOptions.length) {
      auto.selectedLoan = true;
      confirmLoan(loanOptions[0]);
      return;
    }
    if (hasUploader && !auto.uploadedDocs) {
      auto.uploadedDocs = true;
      onUploadAll(["Thornfield_2024_Management_Accounts.pdf", "Signed_Contract.pdf"]);
      return;
    }
    if (hasPaymentDetails && !auto.confirmedAccount && disbursementAccounts && disbursementAccounts.length) {
      auto.confirmedAccount = true;
      confirmDisbursement(disbursementAccounts.find((account) => account.primary) || disbursementAccounts[0]);
    }
  }, [busy, disbursementAccounts, expected, hasLoanOptions, hasPaymentDetails, hasUploader, loanChoice, loanOptions, started, userHasSpoken]);

  let placeholder = "Type a message…";
  if (expected && expected.kind === "upload") placeholder = "Add your two documents in the upload box above…";
  else if (expected && expected.kind === "sign") placeholder = "Sign your declaration below to finish…";
  else if (ended) placeholder = "Your RCF increase is submitted.";

  const idlePlaceholder = "Press \u201CTalk to " + agent.name + "\u201D to begin\u2026";
  return (
    <div className="app">
      {AUTOFLOW && !RECORDING_MODE && <ChatAutoflowPanel checks={chatQaChecks} selectedLoan={loanChoice} />}
      <TopNav brand={brand} member={file.member} />
      <div className="layout">
        <aside className="hero-col">
          <WelcomeIntro brand={brand} persona={persona} agent={agent} started={started} onStart={() => setStarted(true)} />
        </aside>
        <main className="chat-col">
          <div className="chat-card">
            <AChatHeader agent={agent} />
            {started
              ? <AChatLog items={items} typing={typing} ctx={ctx} bottomRef={bottomRef} />
              : <ChatIdle agent={agent} onStart={() => setStarted(true)} />}
            <AComposer
              chips={started ? chips : []}
              onSend={onSend}
              disabled={!started || busy || ended}
              placeholder={started ? placeholder : idlePlaceholder}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function ChatAutoflowPanel({ checks, selectedLoan }) {
  const passed = Object.values(checks).every(Boolean);
  return (
    <div className={"chat-qa-panel " + (passed ? "is-pass" : "is-running")} data-chat-autoflow={passed ? "passed" : "running"}>
      <div className="chat-qa-title">Autoflow QA</div>
      <div className="chat-qa-sub">{passed ? "Passed" : "Running"}{selectedLoan ? " · " + selectedLoan : ""}</div>
      <div className="chat-qa-checks">
        {Object.entries(checks).map(([key, ok]) => (
          <span key={key} className={ok ? "is-ok" : ""}>{ok ? "✓" : "·"} {key}</span>
        ))}
      </div>
    </div>
  );
}

/* ---- boot ---- */
async function boot() {
  // DEMO_CONFIG comes from config.js (query-param driven): mode (mock|live) + domain (business|student).
  const DEMO = window.DEMO_CONFIG || { mode: "mock", domain: "business", live: {} };
  const paceParam = Number(new URLSearchParams(window.location.search).get("pace"));
  window.TALDemoPace = Number.isFinite(paceParam) && paceParam > 0
    ? Math.min(Math.max(paceParam, 0.5), 3)
    : DEFAULT_DEMO_PACE;
  const isStudent = DEMO.domain === "student";
  const mockFile = isStudent ? "./mock-data.student.json" : "./mock-data.json";
  let cfg, mock;
  try {
    const freshJson = (path) => fetch(path + (path.includes("?") ? "&" : "?") + "v=" + Date.now(), { cache: "no-store" }).then((r) => r.json());
    const fetches = [
      freshJson("./brand.config.json"),
      freshJson(mockFile)
    ];
    // Student offers live in their own file (the student mock keeps loan_options empty).
    if (isStudent) fetches.push(freshJson("./offers.student.json"));
    const loaded = await Promise.all(fetches);
    cfg = loaded[0]; mock = loaded[1];
    if (isStudent && loaded[2]) mock.loan_options = loaded[2]; // student offers override
  } catch (e) {
    document.getElementById("root").innerHTML =
      '<div style="padding:40px;font-family:system-ui;color:#c0392b">Could not load brand/mock data (' + mockFile + '). Serve the app over http.</div>';
    return;
  }

  // inject brand tokens as CSS variables (single source of truth)
  const t = cfg.tokens || {};
  // Core brand tokens + the "warm" button/bubble/glow vars. Each var is only set when the
  // token is PRESENT in brand.config. The fill-*/glow/ring/grad keys recolor
  // buttons and chat bubbles, overriding the styles.css
  // defaults. See styles.css :root for the defaults these override.
  const map = {
    "brand": "--brand", "brand-600": "--brand-600", "brand-700": "--brand-700",
    "brand-on": "--brand-on", "brand-tint": "--brand-tint",
    "fill-dark": "--fill-dark", "fill-dark-2": "--fill-dark-2",
    "shadow-glow": "--shadow-glow", "ring-focus": "--ring-focus", "grad-brand": "--grad-brand"
  };
  Object.keys(map).forEach((k) => { if (t[k]) document.documentElement.style.setProperty(map[k], t[k]); });

  window.TALBrand = {
    name: cfg.brand.name, product: cfg.brand.product_label, logo: cfg.brand.logo,
    logo_alt: cfg.brand.logo_alt, agent_name: cfg.brand.agent_name,
    agent_title: cfg.brand.agent_title, agent_avatar: cfg.brand.agent_avatar,
    trust_count: cfg.brand.trust_count, trust_audience: cfg.brand.trust_audience,
    pos_term: cfg.brand.pos_term, pos_blurb: cfg.brand.pos_blurb,
    locale: cfg.locale, currency: cfg.currency
  };
  document.title = cfg.brand.name + " " + cfg.brand.product_label;
  // point the favicon at the active brand's logo
  const favicon = document.getElementById("favicon");
  if (favicon && cfg.brand.logo) favicon.href = cfg.brand.logo;

  // Pre-qualified amount + loan-chooser / eligibility copy: derived from the
  // active mock's prequal (policy.sum_insured) + domain, so business AND student
  // both read correctly — and the inline eligibility scan shows the right figure.
  // Brand-aware currency for the client-composed pre-qual / chooser copy (the
  // cards come from the agent already localised; this is the surrounding text).
  const CUR_SYM = ({ GBP: "£", USD: "$", EUR: "€", AUD: "$", NZD: "$", CAD: "$" })[cfg.currency] || "$";
  const CUR_LOC = cfg.locale || "en-GB";
  const prequal = (mock.policy && mock.policy.sum_insured)
    ? CUR_SYM + Number(mock.policy.sum_insured).toLocaleString(CUR_LOC) : null;
  window.TALPrequal = prequal || (CUR_SYM + "500,000");
  window.TALPersonaName = (mock.persona && mock.persona.name) || "James Thornfield";
  // Account tier for the inline eligibility scan's "Account standing" line — brand/persona
  // driven so the active brand shows its product name.
  window.TALPersonaTier = (mock.persona && mock.persona.tier) || "Business Everyday";
  // Locale-sensitive document-analysis fields (entity suffix, company-identifier label +
  // number, currency symbol) consumed by analysis.jsx. UK locale → Ltd + Companies House
  // "Company number" (8 digits); everything else keeps the AU defaults (Pty Ltd + ABN + $).
  const isUK = String(cfg.locale || "").toLowerCase().indexOf("gb") !== -1 || cfg.currency === "GBP";
  window.TALDocLocale = isUK
    ? { cur: "£", entity: (mock.persona && mock.persona.account_name) || "Thornfield Precision Engineering Ltd", coLabel: "Company number", coNumber: "06249013" }
    : { cur: CUR_SYM, entity: (mock.persona && mock.persona.account_name) || "Thornfield Precision Engineering Pty Ltd", coLabel: "ABN", coNumber: "61 624 901 337" };
  window.TALLoanCopy = isStudent
    ? { title: "Choose the finance that fits your studies",
        sub: "Pick the option that suits you, then confirm to continue." }
    : { title: "Two viable facility paths",
        sub: "Both can support the new contract. Talia ranks the RCF amendment first because it preserves flexible headroom while adding hedge cover for imports." };
  window.TALEligLine = isStudent
    ? "Based on your account in good standing, you're eligible to apply. Here are three options — choose the one that fits."
    : "Here are two facility options for the new contract. Review them below, then confirm the path you'd like to take.";

  // Transport seam: mock by default; live when DEMO_CONFIG.mode === "live"
  // (liveTransport talks to the live agent through the chat proxy — see transport.js).
  const transport = (DEMO.mode === "live")
    ? window.TALTransport.createLiveTransport(DEMO.live || {})
    : window.TALTransport.createMockTransport(mock);
  // The redesign uses the multi-step disbursement + EFTPOS-offer flow, so the
  // live transport must defer its auto-lodge relay (the user submits explicitly).
  // setFlow("package") is the opt-in flag key for deferAutoRelay (name kept for
  // back-compat with transport.js — the EFTPOS submit step still triggers lodge).
  if (transport && typeof transport.setFlow === "function") transport.setFlow("package");

  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(React.createElement(App, { brand: window.TALBrand, persona: mock.persona, transport: transport, loanOptions: mock.loan_options || [], posOffer: mock.pos_offer || null, disbursementAccounts: mock.disbursement_accounts || [] }));
}
boot();
