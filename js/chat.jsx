/* chat.jsx — chat spine: Talia header banner, agent-avatar bubbles, rich user
   action bubbles, typing indicator, composer. */
const {
  IconCheckCircle: ChCheck, IconSend: ChSend, IconDoc: ChDoc, IconPen: ChPen,
  IconUpload: ChUpload, IconArrowRight: ChArrow, RichCard: ChRichCard, DocAnalysis: ChDocAnalysis, Uploader: ChUploader,
  LoanOptions: ChLoanOptions, IconCard: ChCard, PosOffer: ChPosOffer, EligibilityCheck: ChEligibility, ScanWidget: ChScanWidget
} = window;

function AgentAvatar({ agent, lg }) {
  return <span className={"agent-av" + (lg ? " lg" : "")}>{(agent && agent.avatar) || "A"}</span>;
}

function ChatHeader({ agent }) {
  return (
    <div className="chat-header">
      <AgentAvatar agent={agent} lg />
      <div className="chat-header-meta">
        <div className="chat-header-nameRow">
          <span className="chat-header-name">{(agent && agent.name) || "Agent"}</span>
          <span className="hdr-pill">{(agent && agent.title) || ""}</span>
        </div>
        <div className="chat-header-title">Handling your request end to end</div>
      </div>
      <div className="chat-header-status"><span className="status-dot live"></span> Online</div>
    </div>
  );
}

function Bubble({ msg, agent }) {
  const { speaker, text, variant, filename, signature } = msg;

  if (speaker === "system") {
    return <div className="bubble-row system"><div className="bubble system"><ChCheck size={14} />{text}</div></div>;
  }

  if (speaker === "customer" && variant === "upload") {
    const multi = msg.count && msg.count > 1;
    return (
      <div className="bubble-row user">
        <div className="bubble user action">
          <span className="action-ico"><ChUpload size={16} /></span>
          <span className="action-meta">
            <span className="action-title">{multi ? "Documents uploaded" : "Document uploaded"}</span>
            <span className="action-file"><ChDoc size={13} /> {multi ? (msg.count + " files") : msg.filename}</span>
          </span>
        </div>
      </div>
    );
  }
  if (speaker === "customer" && variant === "sign") {
    return (
      <div className="bubble-row user">
        <div className="bubble user action">
          <span className="action-ico"><ChPen size={16} /></span>
          <span className="action-meta">
            <span className="action-title">Declaration signed</span>
          </span>
        </div>
      </div>
    );
  }
  if (speaker === "customer" && variant === "account") {
    return (
      <div className="bubble-row user">
        <div className="bubble user action">
          <span className="action-ico"><ChCard size={16} /></span>
          <span className="action-meta">
            <span className="action-title">Facility account</span>
            <span className="action-file">{msg.label}</span>
          </span>
        </div>
      </div>
    );
  }
  if (speaker === "customer" && variant === "pos") {
    return (
      <div className="bubble-row user">
        <div className="bubble user action">
          <span className="action-ico"><ChCard size={16} /></span>
          <span className="action-meta">
            <span className="action-title">{(window.TALBrand && window.TALBrand.pos_term) || "EFTPOS terminal"}</span>
            <span className="action-file">{msg.label}</span>
          </span>
        </div>
      </div>
    );
  }

  if (speaker === "agent") {
    return (
      <div className="bubble-row agent">
        <AgentAvatar agent={agent} />
        <div className="bubble agent">
          {text}
        </div>
      </div>
    );
  }

  // customer plain text
  return (
    <div className="bubble-row user">
      <div className="bubble user">{text}</div>
    </div>
  );
}

function Typing({ agent }) {
  return (
    <div className="bubble-row agent">
      <AgentAvatar agent={agent} />
      <div className="bubble agent" style={{ padding: 0 }}>
        <div className="typing"><span></span><span></span><span></span></div>
      </div>
    </div>
  );
}

// A completed uploader becomes compact. If its top has scrolled out of view,
// compensate its height change before paint so the visible reply cannot jump.
function AnchoredUploader({ ctx }) {
  const ref = React.useRef(null);
  const previousHeight = React.useRef(null);
  React.useLayoutEffect(() => {
    const node = ref.current;
    const scroller = ctx.scrollRef.current;
    if (!node || !scroller) return;
    const height = node.getBoundingClientRect().height;
    const before = previousHeight.current;
    if (before !== null && height !== before) {
      const uploaderTop = node.getBoundingClientRect().top;
      if (uploaderTop < scroller.getBoundingClientRect().top) {
        scroller.scrollTo({ top: scroller.scrollTop + height - before, behavior: "instant" });
      }
    }
    previousHeight.current = height;
  });
  return <div ref={ref} style={{ width: "100%" }}><ChUploader ctx={ctx} /></div>;
}

function ChatLog({ items, typing, ctx, bottomRef }) {
  const agent = ctx.agent;
  const optionLoader = (
    <div className="bubble-row agent card-row" style={{ width: "100%" }}>
      <div className="option-loader card" aria-label="Preparing finance options">
        <div className="option-loader-head">
          <span className="option-loader-dot"></span>
          <div>
            <div className="option-loader-k">Preparing options</div>
            <div className="option-loader-t">Checking fit, terms and next best action</div>
          </div>
        </div>
        <div className="option-loader-steps">
          <span>Facility fit</span>
          <span>Contract timing</span>
          <span>Documents reused</span>
        </div>
      </div>
    </div>
  );
  return (
    <div className="chat-scroll" ref={ctx.scrollRef}>
      {items.map((it, i) => {
        if (it.kind === "message") return <Bubble key={i} msg={it} agent={agent} />;
        if (it.kind === "eligibility_check") {
          return (
            <div className="bubble-row agent card-row" key={it.id || i} style={{ width: "100%" }}>
              <ChEligibility amount={it.amount} />
            </div>
          );
        }
        if (it.kind === "scan") {
          return (
            <div className="bubble-row agent card-row" key={it.id || i} style={{ width: "100%" }}>
              <ChScanWidget docs={it.docs} done={it.done} ctx={ctx} />
            </div>
          );
        }
        if (it.kind === "loan_options") {
          return (
            <div className="bubble-row agent card-row" key={it.id || i} style={{ width: "100%" }}>
              <ChLoanOptions ctx={ctx} />
            </div>
          );
        }
        if (it.kind === "option_loader") {
          return React.cloneElement(optionLoader, { key: it.id || i });
        }
        if (it.kind === "pos") {
          return (
            <div className="bubble-row agent card-row" key={it.id || i} style={{ width: "100%" }}>
              <ChPosOffer ctx={ctx} />
            </div>
          );
        }
        if (it.kind === "uploader") {
          return (
            <div className="bubble-row agent card-row" key={it.id || i} style={{ width: "100%" }}>
              <AnchoredUploader ctx={ctx} />
            </div>
          );
        }
        if (it.kind === "analysis_row") {
          const multi = (it.docs || []).length > 1;
          return (
            <div className="bubble-row agent card-row" key={it.id || i} style={{ width: "100%" }}>
              <div className={"analysis-row" + (multi ? " multi" : "")}>
                {(it.docs || []).map((d) => (
                  <ChDocAnalysis key={d.docId} item={{ docId: d.docId, filename: d.filename, done: it.done }} ctx={ctx} compact={multi} />
                ))}
              </div>
            </div>
          );
        }
        if (it.kind === "analysis") {
          return (
            <div className="bubble-row agent card-row" key={it.id || i} style={{ width: "100%" }}>
              <ChDocAnalysis item={it} ctx={ctx} />
            </div>
          );
        }
        if (it.kind === "card") {
          return (
            <div className="bubble-row agent card-row" key={i} style={{ width: "100%" }}>
              <ChRichCard card={it.card} ctx={ctx} />
            </div>
          );
        }
        return null;
      })}
      {ctx.optionsLoading && !items.some((it) => it.kind === "option_loader") && React.cloneElement(optionLoader, { key: "options-loading" })}
      {typing && <Typing agent={agent} />}
      <div ref={bottomRef} style={{ height: 1 }}></div>
    </div>
  );
}

function Composer({ chips, onSend, disabled, placeholder }) {
  const [val, setVal] = React.useState("");
  function submit() {
    const t = val.trim();
    if (!t || disabled) return;
    onSend(t);
    setVal("");
  }
  return (
    <div className="composer">
      {chips && chips.length > 0 && (
        <div className="chips-row">
          {chips.map((c, i) => (
            <button key={i} className="chip" disabled={disabled} onClick={() => { if (!c.noop) onSend(c.sends); }}>
              <span className="chip-label">{c.label}</span>
              <ChArrow size={15} className="chip-arrow" />
            </button>
          ))}
        </div>
      )}
      <div className="input-row">
        <textarea
          className="input-box" rows={1} value={val}
          placeholder={placeholder || "Type a message…"}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
        />
        <button className="send-btn" onClick={submit} disabled={disabled || !val.trim()} aria-label="Send">
          <ChSend size={20} />
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { ChatLog, ChatHeader, Composer });
