// live-core.js — pure mapping between v3 chat events and the card contract.
// Loaded in the browser (window.LiveCore) and importable in node (module.exports) for tests.
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.LiveCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Unwrap the platform double-wrap, JSON-parsing strings first.
  // contract: output.Response?.result?.result ?? output
  function unwrapToolOutput(raw) {
    var out = raw;
    if (typeof out === "string") { try { out = JSON.parse(out); } catch (e) { return null; } }
    if (out == null) return null;
    // Live tools wrap output as {Response:{result:{<fields>}}}. Some (siamcard-era) double-wrap
    // as {Response:{result:{result:{<fields>}}}}. Return the innermost result object either way.
    if (out.Response && out.Response.result) {
      var r = out.Response.result;
      return (r && typeof r === "object" && typeof r.result !== "undefined") ? r.result : r;
    }
    return out;
  }

  // CARD-CONTRACT §"Tool -> card map". The tool emits contract-shaped data == the card data.
  var TOOL_CARD = {
    verify_identity: "identity_verified",
    lookup_customer: "claim_type_identified",
    check_policy_validity: "cover_status",
    open_claim_file: "claim_file_opened",
    upload_claim_documents: "document_status",
    validate_document: "document_status",
    sign_document: "document_status",
    confirm_payment_details: "payment_details",
    assess_definition_match: "benefit_preview",
    calculate_benefit: "benefit_preview",
    update_claim_status: "claim_lodged",
    trigger_claim_processing: "claim_lodged"
  };
  var LENDING_TOOLS = ["lending_step", "prepare_rcf_application", "validate_management_accounts", "validate_signed_contract", "get_application_status", "submit_for_credit_review", "resume_application"];
  var SKIP = { switch_skill: true };

  function mapToolToCard(toolName, rawOutput) {
    if (!toolName || SKIP[toolName]) return null;
    var type = TOOL_CARD[toolName];
    if (!type) return null;                          // unknown tool -> no card
    var data = unwrapToolOutput(rawOutput);
    if (data == null || data.error) return null;     // recoverable error -> no card (agent_notes drive text)
    return { type: type, data: data };
  }

  // Convert a list of v3 chat events (one buffered agent turn) into the transport
  // contract: { events: [{type:'message',speaker,text}], rich_content: [card,...] }.
  function eventsToTurn(events) {
    var out = { events: [], rich_content: [] };
    var canonical = [];
    (events || []).forEach(function (ev) {
      var d = ev && ev.data; if (!d) return;
      if (d.type === "text") {
        if (ev.speaker === "agent" && d.text) out.events.push({ type: "message", speaker: "agent", text: d.text });
      } else if (d.type === "function_call" && d.function_call) {
        if (LENDING_TOOLS.indexOf(d.function_call.name) !== -1) {
          var result = unwrapToolOutput(d.function_call.output);
          if (result && result.canonical_text) {
            if (canonical.indexOf(result.canonical_text) === -1) canonical.push(result.canonical_text);
            out.rich_content = out.rich_content.concat(result.rich_content || []);
          }
          return;
        }
        var card = mapToolToCard(d.function_call.name, d.function_call.output);
        if (card) out.rich_content.push(card);
      }
    });
    if (canonical.length) out.events = canonical.map(function(text) { return {type:"message",speaker:"agent",text:text}; });
    return out;
  }

  return { unwrapToolOutput: unwrapToolOutput, mapToolToCard: mapToolToCard, eventsToTurn: eventsToTurn, TOOL_CARD: TOOL_CARD };
});
