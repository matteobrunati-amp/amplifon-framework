/* ============================================================================
 * 08 â€” LEAD + BOOTSTRAP
 * Un solo tentativo, un solo successo logico.
 * UI, attribution, tracking e trasporto Unbounce restano separati.
 * ========================================================================== */
(function (w, d) {
  'use strict';

  const App = w.AmplifonApp;

  if (!App || !App.modules.utils || App.boot) return;

  const U = App.modules.utils;

  let state = 'idle';
  let ui = null;
  let engine = null;
  let tracking = null;
  let attribution = null;
  let bridge = null;

  let c = null;
  let attempt = null;
  let redirectTimer = null;
  let cleanupTimer = null;
  let previewTimer = null;

  let nativeProblem = null;
  let bootstrapProblem = null;

  let controller = new AbortController();

  const confirmationFrames = new Map();

  function confirmationAsset(source) {
    if (!source) return '';
    if (/^https:\/\//i.test(String(source))) {
      const absolute = U.safeUrl(source);
      return absolute ? absolute.toString() : '';
    }
    if (!c || !c.assets || !c.assets.repositoryBase) return '';
    const resolved = U.safeUrl(source, c.assets.repositoryBase);
    return resolved ? resolved.toString() : '';
  }

  function confirmationMessage(nonce) {
    return {
      type: 'amp:confirmation-confirmed',
      version: 1,
      nonce: nonce,
      attemptId: attempt.id,
      heading: c.copy.successHeading,
      text: c.copy.successText,
      subtext: c.copy.successSubtext || '',
      lead: c.copy.successLead || '',
      stepsHeading: c.copy.successStepsHeading || '',
      successSteps: Array.isArray(c.copy.successSteps) ? c.copy.successSteps : [],
      reminderHeading: c.copy.successReminderHeading || '',
      reminderText: c.copy.successReminderText || '',
      logo: confirmationAsset(c.assets.logo),
      lang: c.page.htmlLang,
      redirecting: !!(c.success.redirectUrl && c.runtime.mode === 'live'),
      redirectDelayMs: c.success.redirectDelayMs
    };
  }

  function sendConfirmations() {
    if (!attempt || attempt.status !== 'succeeded') return;

    confirmationFrames.forEach(function (entry, source) {
      if (Date.now() - entry.time > 20000) {
        confirmationFrames.delete(source);
        return;
      }

      try {
        source.postMessage(
          confirmationMessage(entry.nonce),
          w.location.origin
        );
      } catch (_) {
        /* Nessun retry di lead. */
      }
    });
  }

  function onConfirmationRequest(event) {
    if (
      !c.success.allowNativeConfirmationHandshake ||
      event.origin !== w.location.origin ||
      event.source === w
    ) {
      return;
    }

    const message = event.data;

    if (
      !message ||
      message.type !== 'amp:confirmation-ready' ||
      message.version !== 1 ||
      typeof message.nonce !== 'string' ||
      !/^[\w-]{8,100}$/.test(message.nonce)
    ) {
      return;
    }

    const childFrame = Array.from(
      d.querySelectorAll('iframe')
    ).some(function (frame) {
      return frame.contentWindow === event.source;
    });

    if (
      !childFrame ||
      !attempt ||
      (
        confirmationFrames.size >= 4 &&
        !confirmationFrames.has(event.source)
      )
    ) {
      return;
    }

    confirmationFrames.set(
      event.source,
      {
        nonce: message.nonce,
        time: Date.now()
      }
    );

    sendConfirmations();
  }

  function before(id) {
    if (
      !attempt ||
      attempt.id !== id ||
      attempt.beforeTracked
    ) {
      return;
    }

    attempt.beforeTracked = true;
    attempt.status = 'submitting';

    tracking.trackFormSubmit(attempt);
  }

  function succeeded(id) {
    if (
      !attempt ||
      attempt.id !== id ||
      attempt.status === 'succeeded'
    ) {
      return;
    }

    attempt.status = 'succeeded';

    tracking.trackFormSent(attempt);
    ui.setStatus('succeeded');

    if ((c.success.presentation || 'framework') === 'framework') {
      ui.showSuccess();
    }

    engine.cleanAfterSuccess();

    sendConfirmations();

    cleanupTimer = setTimeout(function () {
      if (
        attempt &&
        attempt.id === id
      ) {
        attempt.values = null;
        attempt.context = null;
      }

      if (bridge) {
        bridge.clearPersonal();
      }
    }, c.tracking.contactLifetimeMs);

    if (
      c.success.redirectUrl &&
      c.runtime.mode === 'live'
    ) {
      redirectTimer = setTimeout(function () {
        const destination =
          U.safeUrl(c.success.redirectUrl);

        if (
          destination &&
          c.success.allowedRedirectOrigins.includes(
            destination.origin
          ) &&
          destination.pathname.startsWith(
            c.success.requiredPathPrefix
          )
        ) {
          w.location.assign(
            attribution.decorate(
              destination.toString()
            )
          );
        }
      }, c.success.redirectDelayMs);
    }
  }

  function unknown(id) {
    if (
      !attempt ||
      attempt.id !== id ||
      attempt.status === 'succeeded'
    ) {
      return;
    }

    attempt.status = 'unknown';

    ui.setStatus(
      'unknown',
      c.copy.errors.unknown
    );
  }

  function failed(id, code) {
    if (
      !attempt ||
      attempt.id !== id ||
      attempt.status === 'succeeded'
    ) {
      return;
    }

    attempt.status = 'failed';

    engine.lockSubmission(false);

    ui.setStatus(
      'failed',
      code === 'NATIVE_VALIDATION'
        ? c.copy.errors.nativeValidation
        : c.copy.errors.failed
    );
  }

  function openTrackedLink(data) {
    if (!data || !data.href) return;

    attribution.interaction(data.icmp);

    const href =
      attribution.decorate(data.href);

    if (
      data.target === '_blank'
    ) {
      w.open(
        href,
        '_blank',
        'noopener,noreferrer'
      );
      return;
    }

    w.location.assign(href);
  }

  function submit(raw) {
    if (
      engine.current() !== 'contact' ||
      (
        attempt &&
        [
          'submitting',
          'pending',
          'unknown',
          'succeeded'
        ].includes(attempt.status)
      )
    ) {
      return;
    }

    const context = engine.snapshot();

    const values = U.normalize(
      {
        ...raw,
        zipcode: context.postcode
      },
      c
    );

    const errors =
      U.validate(values, c);

    ui.setErrors(errors);

    if (Object.keys(errors).length) {
      return;
    }

    if (c.runtime.mode !== 'preview') {
      if (U.releaseBlocks(c).length) {
        ui.setStatus(
          'blocked',
          c.copy.errors.staging
        );
        return;
      }

      if (
        !bridge ||
        !bridge.inspect().ready
      ) {
        ui.setStatus(
          'failed',
          c.copy.errors.unavailable
        );
        return;
      }
    }

    attribution.interaction(
      c.attribution.icmp.submit
    );

    const campaign =
      attribution.snapshot();

    if (
      c.attribution.requireMci &&
      !campaign.mci
    ) {
      ui.setStatus(
        'blocked',
        c.copy.errors.staging
      );
      return;
    }

    attempt = {
      id: U.uid(),
      status: 'pending',
      values: U.clone(values),
      context: context,
      attribution: campaign,
      beforeTracked: false
    };

    engine.lockSubmission(true);

    ui.setStatus(
      'submitting',
      c.copy.sending
    );

    if (c.runtime.mode === 'preview') {
      before(attempt.id);

      previewTimer = setTimeout(
        function () {
          succeeded(attempt.id);
        },
        350
      );

      return;
    }

    try {
      bridge.submit(attempt);
    } catch (error) {
      nativeProblem = error.message;

      failed(
        attempt.id,
        error.message === 'NATIVE_VALIDATION'
          ? 'NATIVE_VALIDATION'
          : 'NATIVE_START_FAILED'
      );
    }
  }

  async function boot() {
    if (
      state === 'starting' ||
      state === 'ready'
    ) {
      return;
    }

    state = 'starting';
    c = w.AMPLIFON_CONFIG;

    try {
      U.validateConfig(c);

      [
        'tracking',
        'attribution',
        'renderer',
        'multistep',
        'unbounce'
      ].forEach(function (name) {
        U.assert(
          App.modules[name],
          'MODULE_MISSING:' + name
        );
      });

      tracking =
        App.modules.tracking.create(c);

      attribution =
        App.modules.attribution.create(c);

      ui =
        App.modules.renderer.create(c);

      ui.mount();

      engine =
        App.modules.multistep.create(
          c,
          {
            step: function (
              step,
              context,
              focus,
              emit
            ) {
              ui.showQuiz(
                step,
                context,
                focus
              );

              if (emit) {
                tracking.trackStepView(
                  step,
                  context
                );
              }
            },

            contact: function (
              context,
              focus,
              emit
            ) {
              ui.showContact(focus);

              if (emit) {
                tracking.trackFormView(
                  context
                );
              }
            },

            answer: function (
              step,
              option
            ) {
              attribution.interaction(
                option.icmp
              );

              tracking.trackAnswer(
                step.id,
                option.id
              );
            },

            postcode: function () {
              attribution.interaction(
                c.attribution.icmp
                  .postcodeContinue
              );
            },

            invalidPostcode: function () {
              ui.postcodeError();
            },

            rejection: function (context) {
              tracking.trackRejection(
                context
              );
            },

            back: function () {
              attribution.interaction(
                c.attribution.icmp.back
              );
            },

            start: function () {
              attribution.interaction(
                c.attribution.icmp.bottomCta
              );
            }
          }
        );

      ui.bind({
        answer: engine.answer,
        postcode: engine.postcode,
        back: engine.back,

        /*
         * CTA esplicita "JETZT STARTEN":
         * torna al questionario e SOLO QUI Ã¨ ammesso lo scroll.
         */
        start: function () {
          engine.resume();

          if (
            ui.returnToQuestion
          ) {
            ui.returnToQuestion();
          }
        },

        edit: engine.edit,
        submit: submit,
        link: openTrackedLink
      });

      engine.start();

      state = 'ready';

      w.addEventListener(
        'message',
        onConfirmationRequest,
        {
          signal: controller.signal
        }
      );

      w.addEventListener(
        'amp:consent-changed',
        function () {
          tracking.consentChanged();
        },
        {
          signal: controller.signal
        }
      );

      if (c.runtime.mode !== 'preview') {
        bridge =
          App.modules.unbounce.create(
            c,
            {
              before: before,
              success: succeeded,
              failure: failed,
              unknown: unknown
            }
          );

        try {
          await bridge.init();

          attribution.useNative(
            bridge.readTechnical
          );
        } catch (error) {
          nativeProblem =
            error.message === 'DEPENDENCY_TIMEOUT'
              ? (
                bridge.inspect().problem ||
                error.message
              )
              : error.message;

          bridge.setProblem(
            nativeProblem
          );
        }
      }
    } catch (error) {
      state = 'error';
      bootstrapProblem = error.message;

      const message =
        c && c.copy
          ? c.copy.errors.configuration
          : 'Die Seite konnte nicht geladen werden.';

      if (
        !d.getElementById(
          c && c.runtime
            ? c.runtime.rootId
            : 'amp-app'
        )
      ) {
        const panel = U.node(
          'div',
          {
            class: 'amp-bootstrap-error',
            role: 'alert',
            text: message
          }
        );

        d.body.prepend(panel);
      }

      console.error(
        '[AMP]',
        bootstrapProblem
      );
    }
  }

  function inspect() {
    return {
      version: App.version,
      state: state,
      mode:
        c
          ? c.runtime.mode
          : null,

      bootstrapProblem:
        bootstrapProblem,

      nativeProblem:
        nativeProblem,

      releaseBlocks:
        c
          ? U.releaseBlocks(c)
          : [],

      funnel:
        engine
          ? engine.inspect()
          : null,

      submission:
        attempt
          ? {
            id: attempt.id,
            status: attempt.status
          }
          : {
            status: 'idle'
          },

      native:
        bridge
          ? bridge.inspect()
          : {
            ready:
              c &&
              c.runtime.mode === 'preview',
            simulated: true
          },

      attribution:
        attribution
          ? attribution.inspect()
          : null,

      tracking:
        tracking
          ? tracking.inspect()
          : null
    };
  }

  function destroy() {
    U.assert(
      !attempt ||
      ![
        'pending',
        'submitting',
        'unknown'
      ].includes(attempt.status),
      'DESTROY_DURING_SUBMIT'
    );

    controller.abort();
    controller =
      new AbortController();

    clearTimeout(redirectTimer);
    clearTimeout(cleanupTimer);
    clearTimeout(previewTimer);

    if (tracking) {
      tracking.destroy();
    }

    if (bridge) {
      bridge.destroy();
    }

    if (ui) {
      ui.destroy();
    }

    confirmationFrames.clear();

    attempt = null;
    state = 'idle';
    bootstrapProblem = null;
    nativeProblem = null;
  }

  App.boot = boot;
  App.inspect = inspect;
  App.destroy = destroy;

  App.refreshConsent = function () {
    if (tracking) {
      tracking.consentChanged();
    }
  };

  U.ready(boot);
})(window, document);


