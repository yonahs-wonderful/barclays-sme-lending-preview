/* cards.jsx — all CardType renderers (CARD-CONTRACT.md). Render inline + drive the panel.
   Cards read LIVE document state from ctx.file so the hero issue->sign->green
   transition happens in place. No card type is invented; field names match the contract. */
const {
  Icon: CIcon, IconCheck: CCheck, IconCheckCircle: CCheckCircle, IconShield: CShield,
  IconUser: CUser, IconDoc: CDoc, IconFolder: CFolder, IconPen: CPen, IconCard: CCard,
  IconAward: CAward, IconAlert: CAlert, IconId: CId, IconStethoscope: CSteth,
  IconReceipt: CReceipt, IconUpload: CUpload, ESignPad: CESignPad, FilePicker: CFilePicker,
  DocAnalysis: CDocAnalysis, IconPercent: CPercent, IconCalendar: CCalendar, IconClock: CClock, IconArrowRight: CArrowR
} = window;

/* locale/currency-aware money formatter (reads brand at call time, nothing hardcoded) */
function fmtMoney(amount, currency) {
  const b = window.TALBrand || {};
  try {
    return new Intl.NumberFormat(b.locale || "en-AU", {
      style: "currency", currency: currency || b.currency || "GBP", maximumFractionDigits: 0
    }).format(amount);
  } catch (e) { return (currency || "") + " " + amount; }
}
function fmtDate(iso) {
  const b = window.TALBrand || {};
  try { return new Date(iso).toLocaleDateString(b.locale || "en-AU", { day: "numeric", month: "short", year: "numeric" }); }
  catch (e) { return iso; }
}
/* brand name (reads brand at call time) */
function brandName() { return (window.TALBrand && window.TALBrand.name) || "Barclays"; }

const DOC_ICON = {
  claim_form: CDoc,
  medical_authority: CShield,
  medical_report: CReceipt,
  id_check: CId,
  bank_details: CCard,
  kyc_profile: CShield,
  ubo_declaration: CUser,
  director_ids: CId,
  accounts_2022: CReceipt,
  accounts_2023: CReceipt,
  prior_credit_memo: CFolder,
  management_accounts_2024: CReceipt,
  jlr_contract: CDoc
};
const STATUS_LABEL = { required: "Required", received: "On file", validated: "Validated", issue: "Action needed" };
function StatusChip({ status }) {
  const ico = status === "validated" ? <CCheck size={13} /> : status === "issue" ? <CAlert size={13} /> : null;
  return <span className={"chip-status s-" + status}>{ico}{STATUS_LABEL[status] || status}</span>;
}

const DOC_FILE_PREVIEW = {
  kyc_profile: {
    filename: "KYC_Profile_Thornfield_2026.pdf",
    source: "Customer master file",
    updated: "31 Oct 2026",
    summary: "Entity KYC profile is current and linked to CIF-TH-4471823.",
    fields: [["Entity", "Thornfield Precision Engineering Ltd"], ["KYC expiry", "31 Oct 2026"], ["Risk tier", "Medium"]]
  },
  ubo_declaration: {
    filename: "UBO_Declaration_Thornfield_2025.pdf",
    source: "Beneficial ownership register",
    updated: "14 May 2025",
    summary: "Ownership declaration held on file with no outstanding attestations.",
    fields: [["James Thornfield", "67%"], ["Emma Thornfield", "33%"], ["Status", "Validated"]]
  },
  director_ids: {
    filename: "Director_IDs_Thornfield.pdf",
    source: "Identity vault",
    updated: "12 Mar 2025",
    summary: "Director IDs are verified and reusable for this facility amendment.",
    fields: [["Directors", "James Thornfield, Emma Thornfield"], ["ID check", "Passed"], ["Expiry check", "Clear"]]
  },
  accounts_2022: {
    filename: "Thornfield_Statutory_Accounts_2022.pdf",
    source: "Companies House filing",
    updated: "28 Feb 2023",
    summary: "Filed accounts are stored on the relationship record.",
    fields: [["Revenue", "$4.6m"], ["EBITDA", "$510k"], ["Filing status", "Accepted"]]
  },
  accounts_2023: {
    filename: "Thornfield_Statutory_Accounts_2023.pdf",
    source: "Companies House filing",
    updated: "27 Feb 2024",
    summary: "Most recent statutory accounts before the management update.",
    fields: [["Revenue", "$5.1m"], ["EBITDA", "$565k"], ["Filing status", "Accepted"]]
  },
  prior_credit_memo: {
    filename: "Prior_Credit_Memo_RCF_2024.pdf",
    source: "Credit archive",
    updated: "29 Jun 2024",
    summary: "Current RCF terms and prior approval memo were reused for the increase.",
    fields: [["Existing limit", "£200,000"], ["Facility ref", "RCF-2024-TH-00291"], ["Conduct", "Clean"]]
  },
  management_accounts_2024: {
    filename: "Thornfield_2024_Management_Accounts.pdf",
    source: "Customer upload",
    updated: "Today",
    summary: "Uploaded management accounts validate the serviceability metrics and note a $780,000 contract pipeline.",
    fields: [["Revenue growth", "10% YoY"], ["EBITDA", "$620,000"], ["Pipeline value", "$780,000"]]
  },
  jlr_contract: {
    filename: "Signed_Contract.pdf",
    source: "Customer upload",
    updated: "Today",
    summary: "Signed contract supports the working-capital request, with a $20,000 value variance flagged for credit review.",
    fields: [["Signed value", "$760,000"], ["Memo value", "$780,000"], ["Variance", "$20,000 reviewed"]]
  }
};

function docPreviewFor(doc) {
  const fallback = DOC_FILE_PREVIEW[doc.id] || {};
  return Object.assign({
    filename: doc.filename || (String(doc.label || "Document").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "Document") + ".pdf",
    source: "Bank records",
    updated: "On file",
    summary: doc.label || "Document available on file.",
    fields: [["Status", STATUS_LABEL[doc.status] || doc.status || "On file"]]
  }, fallback, doc.filename ? { filename: doc.filename } : {});
}

const CardShell = ({ icon, label, title, caption, children, className }) => (
  <div className={"card lift " + (className || "")}>
    <div className="card-head">
      {icon && <span className="card-ic">{icon}</span>}
      <div className="card-htext">
        {label && <div className="card-eyebrow">{label}</div>}
        {title && <div className="card-title2">{title}</div>}
      </div>
    </div>
    {caption && <div className="card-cap">{caption}</div>}
    {children}
  </div>
);
const KV = ({ k, v }) => <div className="kv"><span className="k">{k}</span><span className="v">{v}</span></div>;

/* ---- identity_verified ---- */
function IdentityCard({ data }) {
  return (
    <div className="verified-badge">
      <CCheckCircle className="ico" size={18} fill={false} />
      <span>Identity verified · <strong>{data.name}</strong></span>
    </div>
  );
}

/* ---- claim_type_identified ---- */
function ClaimTypeCard({ data }) {
  return (
    <CardShell icon={<CFolder size={15} />} label="Facility request identified">
      <div className="card-title">{data.condition}</div>
      <div className="card-sub">{data.plain_summary}</div>
      <div className="card-rows" style={{ marginTop: 12 }}>
        <KV k="Relationship" v={data.cover} />
        <KV k="Request type" v={data.claim_type[0].toUpperCase() + data.claim_type.slice(1)} />
      </div>
    </CardShell>
  );
}

/* ---- cover_status ---- */
function CoverStatusCard({ data }) {
  return (
    <CardShell icon={<CShield size={15} />} label="Reuse check" className="eligible-card">
      <div className="big-yes"><CCheckCircle size={20} /> Existing facility active</div>
      <div className="card-rows" style={{ marginTop: 12 }}>
        <KV k="Facility" v={data.policy_no} />
        <KV k="Product" v={data.product} />
        <KV k="Open since" v={fmtDate(data.in_force_since)} />
        <KV k="Request date" v={fmtDate(data.date_of_event)} />
        <div className="kv"><span className="k">KYC / UBO reuse</span><span className="v"><StatusChip status="validated" /></span></div>
        <div className="kv"><span className="k">Result</span><span className="v"><span className={"chip-status s-" + data.result}>{data.result}</span></span></div>
      </div>
    </CardShell>
  );
}

/* ---- claim_file_opened : read-only live summary in chat ----
   Uploads now live in the claim-file panel (sidebar) so they don't fight the
   chat scroll on every validation. The chat card mirrors status only. */
function ClaimFileCard({ data, ctx }) {
  return (
    <CardShell icon={<CFolder size={15} />} label="RCF file opened">
      <div className="card-rows" style={{ marginBottom: 12 }}>
        <KV k="Case reference" v={data.claim_ref} />
      </div>
      <div className="cds-list">
        {data.required_documents.map((d) => {
          const live = ctx.docState(d.id) || d;
          const st = live.status || "required";
          const IcoEl = DOC_ICON[d.id] || CDoc;
          return (
            <div className={"cds-row " + st} key={d.id}>
              <span className="cds-ico">{st === "validated" ? <CCheck size={14} className="check-pop" /> : <IcoEl size={14} />}</span>
              <span className="cds-label">{d.label}</span>
              <StatusChip status={st} />
            </div>
          );
        })}
      </div>
      <div className="cds-hint"><CUpload size={13} /> Add the two missing documents in the facility file panel</div>
    </CardShell>
  );
}

/* ---- document_status : compact inline confirmation, reads LIVE state ----
   Renders the issue + fix control here too (per contract). When the live doc
   flips to validated, this card morphs to the green confirmation in place. */
function DocStatusCard({ data, ctx }) {
  // Clean validations only update the sidebar; just the issue beat surfaces in chat.
  if (data.status !== "issue") return null;
  const live = ctx.docState(data.doc_id) || data;
  const status = live.status || data.status;
  const issue = (live.issues && live.issues[0]) || (data.issues && data.issues[0]) || null;
  const IcoEl = DOC_ICON[data.doc_id] || CDoc;
  if (status === "validated") {
    return (
      <div className="card lift card-ok">
        <div className="card-head" style={{ marginBottom: 0 }}>
          <span className="card-ic" style={{ background: "linear-gradient(135deg, var(--brand-700), var(--brand))", boxShadow: "0 8px 20px rgba(224,48,30,.3)" }}><CCheck size={20} className="check-pop" /></span>
          <div className="card-htext">
            <div className="card-eyebrow" style={{ color: "var(--brand-700)" }}>Signed &amp; validated</div>
            <div className="card-title2">{data.label}</div>
          </div>
        </div>
      </div>
    );
  }
  // issue: fold the problem into the widget header, then offer the fix inline
  return (
    <CardShell icon={<IcoEl size={20} />} label={issue && issue.fix === "e_sign" ? "Signature required" : "Action needed"} title={data.label} className={issue && issue.fix === "e_sign" ? "card-sign" : "card-warn"}
      caption={issue ? issue.message : "Action needed"}>
      {issue && issue.fix === "e_sign" && <CESignPad onSign={() => ctx.onSign(data.doc_id)} />}
      {issue && issue.fix === "reupload" && <CFilePicker label="Re-upload document" pulse onPick={(name) => ctx.onUpload(data.doc_id, name)} />}
      {issue && issue.fix === "correct" && <button className="btn btn-primary btn-sm" onClick={() => ctx.onSign(data.doc_id)}>Correct &amp; resubmit</button>}
    </CardShell>
  );
}

/* ---- payment_details ----
   Compact "payment method" UI tile — reads as a saved account, not a text table.
   The member can disburse to the on-file account, or pick "another account" and
   choose from their other accounts (or add a new one). */
function last4Of(masked) { return ((masked || "").replace(/[^0-9]/g, "").slice(-4)) || "2910"; }

function BankCardFace({ name, type, masked }) {
  return (
    <div className="bankcard">
      <span className="bankcard-glow" aria-hidden="true"></span>
      <div className="bankcard-row1">
        <img className="bankcard-logo" src={(window.TALBrand && window.TALBrand.logo) || "barclays-logo.svg"} alt={brandName()} />
        <span className="bankcard-type">{type}</span>
      </div>
      <span className="bankcard-chip" aria-hidden="true"></span>
      <div className="bankcard-num"><span>••••</span><span>••••</span><span>••••</span><b>{last4Of(masked)}</b></div>
      <div className="bankcard-foot">
        <span className="bankcard-field">
          <span className="bankcard-lbl">Account holder</span>
          <span className="bankcard-val">{name}</span>
        </span>
      </div>
    </div>
  );
}

function PaymentCard({ data, ctx }) {
  const holder = data.account_name;
  // Account set: the on-file account first, then the member's other accounts.
  // Show only TWO disbursement accounts (the on-file primary + one alternative).
  const accounts = ((ctx && ctx.disbursementAccounts) || [{ id: "rcf", type: "Business Current Account", masked: data.account_masked, primary: true }])
    .map((a) => Object.assign({}, a, { name: holder, masked: a.primary ? data.account_masked : a.masked }))
    .slice(0, 2);
  const confirmed = !!((ctx && ctx.payment && ctx.payment.confirmed) ||
    (ctx && ctx.docState && (ctx.docState("bank_details") || {}).status === "validated"));
  const busy = ctx && ctx.busy;

  const [chosenId, setChosenId] = React.useState((accounts.find((a) => a.primary) || accounts[0]).id);
  const live = (ctx && ctx.payment) || null;
  // After confirmation, reflect whichever account was locked in.
  const lockedId = confirmed && live ? (accounts.find((a) => a.masked === live.account_masked) || {}).id : null;
  const selId = confirmed ? (lockedId || chosenId) : chosenId;
  const chosen = accounts.find((a) => a.id === selId) || accounts[0];

  const confirm = () => {
    if (busy || confirmed) return;
    if (ctx && ctx.onConfirmDisbursement) ctx.onConfirmDisbursement(chosen);
    else if (ctx && ctx.onSend) ctx.onSend("confirm disbursement");
  };

  return (
    <CardShell className="account-selector" icon={<CCard size={20} />} label="Facility account"
      title={confirmed ? "Facility account confirmed" : "Confirm the account linked to this RCF"}
      caption={confirmed ? null : "Choose the " + brandName() + " account where the amended facility will sit."}>
      <div className="paysel">
        <div className="paysel-cards" role="radiogroup" aria-label="Disbursement account">
          {accounts.map((a) => {
            const sel = a.id === selId;
            return (
              <button key={a.id} type="button" role="radio" aria-checked={sel} disabled={confirmed || busy}
                className={"paysel-card" + (sel ? " selected" : "") + (confirmed && !sel ? " dim" : "")}
                onClick={() => { if (!confirmed && !busy) setChosenId(a.id); }}>
                <span className="paysel-check" aria-hidden="true">{sel && <CCheck size={13} />}</span>
                <BankCardFace name={a.name} type={a.type} masked={a.masked} />
              </button>
            );
          })}
        </div>
        <div className="paysel-foot">
          {confirmed
            ? <span className="bankcard-done"><CCheck size={15} /> Amendment will apply to {chosen.type} · {chosen.masked}</span>
            : <button className="btn btn-primary bankcard-confirm" disabled={busy} onClick={confirm}>Use this account</button>}
        </div>
      </div>
    </CardShell>
  );
}

/* ---- benefit_preview ---- */
function BenefitCard({ data }) {
  return (
    <CardShell icon={<CAward size={15} />} label="Indicative benefit">
      {data.indicative && <span className="benefit-indicative">Indicative only</span>}
      <div className="benefit-amount">{fmtMoney(data.amount, data.currency)}</div>
      <div className="card-rows" style={{ marginTop: 12 }}>
        <KV k="Matched event" v={data.matched_event} />
        <KV k="Basis" v={data.schedule_basis} />
      </div>
      <div className="caveat-note" style={{ marginTop: 10 }}>{data.caveat}</div>
    </CardShell>
  );
}

function trackerStatusLabel(status) {
  if (status === "done") return "Done";
  if (status === "active") return "Current";
  return "Pending";
}

function ApplicationStatusTrackerCard({ data, ctx }) {
  // Keep the same stages before and after the first live milestone arrives.
  const milestone = ctx?.milestones?.[data.claim_ref] || {};
  const trackerData = {...data,
    current: milestone.approved
      ? (milestone.entry ? "Approved · application entry complete" : "Approved")
      : (milestone.entry ? "Application entered · awaiting decision" : "Under review"),
    steps: [
      {label: "Documents received", status: "done", detail: "2 uploaded, 6 reused"},
      {label: "Human credit decision", status: milestone.approved ? "done" : "active", detail: milestone.approved ? "Approved in the credit cockpit" : "Awaiting credit review"},
      {label: "CoreBank application entry", status: milestone.entry ? "done" : "active", detail: milestone.entry ? "Back-office task completed successfully" : "Back-office processing"}
    ]
  };
  const steps = trackerData.steps || [];
  if (!steps.length) return null;
  const complete = steps.every((step) => step.status === "done");
  return (
    <CardShell icon={<CClock size={20} />} label="Application status" title={trackerData.title || "Application status"}
      caption={trackerData.claim_ref ? "Case " + trackerData.claim_ref : null} className={"apptrack-card" + (complete ? " apptrack-complete" : "")}>
      {trackerData.current && (
        <div className="apptrack-current">
          <span>{complete ? "Status" : "Current"}</span>
          <strong>{trackerData.current}</strong>
        </div>
      )}
      <div className="apptrack">
        {steps.map((step, index) => {
          const status = step.status || "pending";
          return (
            <div className={"apptrack-row apptrack-" + status} key={step.label || index}>
              <span className="apptrack-node">{status === "done" ? <CCheck size={13} /> : index + 1}</span>
              <span className="apptrack-copy">
                <span className="apptrack-top">
                  <strong>{step.label}</strong>
                  <span>{trackerStatusLabel(status)}</span>
                </span>
                {step.detail && <span className="apptrack-detail">{step.detail}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </CardShell>
  );
}

/* ---- claim_lodged ----
   Final summary, styled like a little brochure: a warm cover with the headline +
   reference, the loan amount as the focal figure, a couple of key facts, and a
   "what happens next" journey so there's something to look forward to. */
function ClaimLodgedCard({ data, ctx }) {
  const loan = ((ctx && ctx.loanOptions) || []).find((o) => o.id === (ctx && ctx.loanChoice)) || {};
  const posAdded = (ctx && ctx.posChoice) === "added";
  const pay = (ctx && ctx.payment) || {};
  const last4 = ((pay.account_masked || "").replace(/[^0-9]/g, "").slice(-4)) || "2910";
  const firstName = (window.TALPersonaName || "James").split(" ")[0];
  const isBooked = data.status === "booked";
  const increase = loan.amount || "£300,000";
  const newLimit = loan.repayment || "£500,000";
  const etaDate = "Today · Wed 1 Jul";
  // Aspirational isometric storefront-expansion preview: an established shop
  // grows the requested expansion while the owner cheers (pre-approval, no
  // confetti). Counter ticks to the requested amount.
  const stageRef = React.useRef(null);
  React.useEffect(() => {
    if (!stageRef.current || !window.NABExpansion) return;
    const amt = parseInt(((loan.amount || "300000") + "").replace(/[^0-9]/g, ""), 10) || 300000;
    const accent = (getComputedStyle(document.documentElement).getPropertyValue("--brand-700") || "").trim() || "#00395D";
    const ctrl = window.NABExpansion.mount(stageRef.current, { amount: amt, label: isBooked ? "Facility booked" : "RCF increase requested", accent: accent });
    return () => { try { ctrl.dispose(); } catch (e) {} };
    // eslint-disable-next-line
  }, []);
  return (
    <div className="card lodged3">
      <div className="lodged3-body">
        <div className="lodged3-stage" ref={stageRef}></div>

        <div className="lodged3-info">
          <div className="l3-top">
            <div className="l3-success">
              <span className="lodged3-seal"><CCheck size={20} className="check-pop" /></span>
              <div className="l3-success-tx">
                <div className="lodged3-eyebrow">{isBooked ? "Facility booked" : "Sent for credit review"}</div>
                <div className="l3-success-head">{isBooked ? `Your facility is live, ${firstName}` : `You're all set, ${firstName}`}</div>
              </div>
            </div>
            <div className="l3-success-sub">
              {isBooked
                ? `Sarah Chen approved the ${increase} increase. The ${newLimit} RCF is booked and the facility letter is ready.`
                : `Your ${increase} RCF increase is with Sarah Chen for credit officer review.`}
            </div>
          </div>

          <div className="l3-eta">
            <span className="l3-eta-ic">{isBooked ? <CCheck size={20} /> : <CClock size={20} />}</span>
            <div className="l3-eta-tx">
              <span className="l3-eta-k">{isBooked ? "Now available" : "Next · credit review expected"}</span>
              <span className="l3-eta-v">{isBooked ? `${newLimit} RCF limit` : etaDate}</span>
              <span className="l3-eta-sub">
                {isBooked ? `Facility letter sent by secure message · ${data.claim_ref}` : "Credit decision and application entry are tracked below."}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="l3-summary">
        <div className="l3-summary-title">Summary <span className="l3-summary-ref">{data.claim_ref}</span></div>
        <div className="l3-chips">
          <span className="l3-chip"><b>{loan.amount || "£300,000"}</b> increase</span>
          <span className="l3-chip"><b>{loan.repayment || "£500,000"}</b> new limit</span>
          <span className="l3-chip">{posAdded ? "Business specialist review added" : "No extra product added"}</span>
          {loan.rate && <span className="l3-chip">{loan.rate}</span>}
          <span className="l3-chip">{brandName()} ••{last4}</span>
        </div>
      </div>
    </div>
  );
}

/* Uploader — the single, persistent "documents" widget. It shows a clean visual
   breakdown of what's still needed vs. already on file (replacing the old
   sidebar), and when the member uploads, the live scan plays INSIDE this same
   widget (no card swap, no chat reflow). Rows update their status in place. */
function DocFilePreview({ doc }) {
  const preview = docPreviewFor(doc);
  return (
    <div className="docfile-preview">
      <div className="docfile-top">
        <span className="docfile-icon"><CDoc size={16} /></span>
        <span className="docfile-title">
          <b title={preview.filename}>{preview.filename}</b>
          <small>{preview.source} · {preview.updated}</small>
        </span>
      </div>
      <p>{preview.summary}</p>
      <div className="docfile-fields">
        {(preview.fields || []).map(([k, v]) => (
          <span className="docfile-field" key={k}>
            <small>{k}</small>
            <b>{v}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

function DocStateRow({ doc, tone, selected, onOpen }) {
  const IcoEl = DOC_ICON[doc.id] || CDoc;
  const st = doc.status;
  const ready = st === "validated" || st === "received";
  const RowTag = ready && onOpen ? "button" : "div";
  return (
    <RowTag
      type={RowTag === "button" ? "button" : undefined}
      className={"docrow " + tone + (doc.scanning ? " scanning" : "") + (ready && onOpen ? " clickable" : "") + (selected ? " open" : "")}
      aria-expanded={ready && onOpen ? !!selected : undefined}
      onClick={ready && onOpen ? onOpen : undefined}
    >
      <span className="docrow-ic">
        {doc.scanning ? <span className="docrow-spin"></span>
          : ready ? <CCheck size={14} className="check-pop" />
            : <IcoEl size={15} />}
      </span>
      <span className="docrow-label">{doc.label}</span>
      {doc.scanning
        ? <span className="docrow-scan">Scanning…</span>
        : <StatusChip status={st} />}
      {ready && onOpen && <span className="docrow-open">{selected ? "Hide file" : "View file"}</span>}
    </RowTag>
  );
}

function Uploader({ ctx }) {
  const docs = (ctx.documents || []).filter((d) => d.id !== "bank_details").map((d) => {
    const live = ctx.docState(d.id) || d;
    return Object.assign({}, d, { status: live.status || "required", filename: live.filename || null, scanning: !!ctx.isProcessing(d.id) });
  });
  const needed = docs.filter((d) => d.status === "required" || d.status === "issue");
  const ready = docs.filter((d) => d.status === "validated" || d.status === "received");
  // The dropzone only stays while there's still an un-uploaded required doc.
  const outstanding = docs.filter((d) => d.status === "required" && !d.scanning);
  const [drag, setDrag] = React.useState(false);
  const [openDocId, setOpenDocId] = React.useState(null);
  const inputRef = React.useRef(null);

  if (!needed.length) {
    return (
      <CardShell icon={<CCheckCircle size={20} />} label="Documents complete">
        <div className="uploader-done"><CCheckCircle size={16} /> All documents received and validated.</div>
      </CardShell>
    );
  }

  function handleFiles(fileList) {
    if (ctx.busy) return;
    ctx.onUploadAll(Array.from(fileList || []).map((f) => f.name)); // empty -> caller uses demo defaults
  }

  const n = outstanding.length;
  return (
    <CardShell icon={<CUpload size={20} />} label="Your documents" title="Upload your files"
      caption="Here's what the RCF increase still needs — drop them below and I'll read and validate each one right here.">

      <div className="docstate">
          <div className="docstate-col need">
            <div className="docstate-gh"><span className="docstate-gh-dot need"></span> Still needed <span className="docstate-ct">{needed.length}</span></div>
            <div className="docstate-list">
              {needed.map((d) => <DocStateRow key={d.id} doc={d} tone="need" />)}
            </div>
          </div>
        {ready.length > 0 && (
          <div className="docstate-col have">
            <div className="docstate-gh"><span className="docstate-gh-dot have"></span> Already on file <span className="docstate-ct">{ready.length}</span></div>
            <div className="docstate-list">
              {ready.map((d) => (
                <React.Fragment key={d.id}>
                  <DocStateRow
                    doc={d}
                    tone="have"
                    selected={openDocId === d.id}
                    onOpen={() => setOpenDocId((current) => current === d.id ? null : d.id)}
                  />
                  {openDocId === d.id && <DocFilePreview doc={d} />}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      {outstanding.length > 0 && (
        <div
          className={"dropzone" + (drag ? " over" : "") + (ctx.busy ? " busy" : "")}
          role="button" tabIndex={0}
          onDragOver={(e) => { e.preventDefault(); if (!ctx.busy) setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer && e.dataTransfer.files); }}
          onClick={() => { if (!ctx.busy && inputRef.current) inputRef.current.click(); }}
          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !ctx.busy && inputRef.current) { e.preventDefault(); inputRef.current.click(); } }}
        >
          <input ref={inputRef} type="file" accept="image/*,application/pdf" multiple style={{ display: "none" }}
            onChange={(e) => { const fs = e.target.files; e.target.value = ""; handleFiles(fs); }} />
          <span className="dropzone-ic"><CUpload size={24} /></span>
          <div className="dropzone-text">
            <span className="dropzone-main">Drag &amp; drop, or <span className="dropzone-link">browse</span></span>
            <span className="dropzone-sub">PDF or photo · {n} document{n > 1 ? "s" : ""} to add</span>
          </div>
        </div>
      )}
    </CardShell>
  );
}

const CARD_RENDERERS = {
  identity_verified: IdentityCard,
  claim_type_identified: ClaimTypeCard,
  cover_status: CoverStatusCard,
  claim_file_opened: ClaimFileCard,
  document_status: DocStatusCard,
  payment_details: PaymentCard,
  benefit_preview: BenefitCard,
  application_status_tracker: ApplicationStatusTrackerCard,
  claim_lodged: ClaimLodgedCard
};
function RichCard({ card, ctx }) {
  const R = CARD_RENDERERS[card.type];
  if (!R) return null;
  return <R data={card.data} ctx={ctx} />;
}

Object.assign(window, { RichCard, Uploader, fmtMoney, fmtDate, DOC_ICON, StatusChip });
