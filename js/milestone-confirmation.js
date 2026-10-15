/* Real demo milestones only; elapsed time never creates a success message. */
(function () {
  window.createMilestoneConfirmation = function (onMessage, getMilestones) {
    const tracked = new Map();
    let disposed = false;
    return {
      schedule(card) {
        if (typeof getMilestones !== 'function' || card.type !== 'claim_lodged' || !card.data?.claim_ref) return;
        const id = card.data.claim_ref + ':' + (card.data.submitted_at || card.data.task_id || 'demo');
        if (tracked.has(id)) return;
        const state = {sent: new Set(), timer: null, deadline: Date.now() + 60 * 60 * 1000};
        tracked.set(id, state);
        async function poll() {
          try {
            const response = await getMilestones();
            if (disposed) return;
            const status = response.data || {};
            if (status.reference === card.data.claim_ref) {
              const milestones = [
                ['approved', status.approved, 'James, your facility increase has been approved.'],
                ['entry', status.approved && status.entry_completed, 'James, your application entry in CoreBank is complete.']
              ];
              for (const [name, ready, text] of milestones) {
                if (!ready || state.sent.has(name)) continue;
                state.sent.add(name);
                onMessage({id: 'milestone:' + id + ':' + name, kind: 'message', speaker: 'agent', milestone: name, reference: status.reference,
                  text: text + ' Your reference is ' + status.reference + '.'});
              }
            }
          } catch (_) { /* A temporary outage is not a completion; retry without a success message. */ }
          if (!disposed && state.sent.size < 2 && Date.now() < state.deadline) state.timer = setTimeout(poll, 3000);
        }
        poll();
      },
      dispose() { disposed = true; tracked.forEach(state => clearTimeout(state.timer)); tracked.clear(); }
    };
  };
})();
