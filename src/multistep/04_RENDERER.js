/* 05 — RENDERER. Tutto il markup visibile nasce dalla CONFIG, non dal DOM legacy. */
(function (w, d) {
  'use strict';

  const App = w.AmplifonApp;
  const U = App.modules.utils;

  if (App.modules.renderer) return;

  function create(c) {
    const N = U.node;
    const signalOwner = new AbortController();

    let actions = {};
    let current = null;

    const root = N('div', {
      id: c.runtime.rootId,
      class: 'amp-app'
    });

    const content = N('main', {
      class: 'amp-main'
    });

    const quizView = N('div', {
      'data-amp-view': 'quiz'
    });

    const contactView = N(
      'section',
      {
        'data-amp-view': 'contact',
        class: 'amp-contact amp-shell',
        hidden: true
      }
    );

    const successView = N(
      'section',
      {
        'data-amp-view': 'success',
        class: 'amp-confirmation amp-shell',
        hidden: true
      }
    );

    const stepCard = N(
      'section',
      {
        class: 'amp-question-card',
        'aria-labelledby': 'amp-question-title'
      }
    );

    const controls = {};
    const errors = {};

    const status = N(
      'p',
      {
        class: 'amp-form-status',
        role: 'status',
        'aria-live': 'polite',
        hidden: true
      }
    );

    const form = N(
      'form',
      {
        class: 'amp-contact-form',
        id: 'amp-contact-form',
        novalidate: true
      }
    );

    const sendButton = N(
      'button',
      {
        type: 'submit',
        class: 'amp-button amp-submit',
        text: c.copy.submit
      }
    );

    const contactBack = N(
      'button',
      {
        type: 'button',
        class: 'amp-back',
        'data-amp-action': 'back',
        text: '‹ ' + c.copy.back
      }
    );

    const original = {
      lang: d.documentElement.lang,
      title: d.title
    };

    function assetUrl(source) {
      if (!source) return '';

      const value = String(source).trim();

      if (!value) return '';

      if (/^https?:\/\//i.test(value)) {
        const absolute = U.safeUrl(value);
        return absolute ? absolute.toString() : '';
      }

      const base =
        c.assets &&
        c.assets.repositoryBase
          ? U.safeUrl(c.assets.repositoryBase)
          : null;

      if (!base) {
        if (c.runtime.debug) {
          console.warn(
            '[AMP renderer] repositoryBase mancante:',
            value
          );
        }

        return '';
      }

      const resolved = U.safeUrl(
        value,
        base.toString()
      );

      return resolved
        ? resolved.toString()
        : '';
    }

    function img(source, alt, className, eager) {
      const src = assetUrl(source);

      if (!src) return null;

      return N(
        'img',
        {
          src: src,
          alt: alt || '',
          class: className,
          decoding: 'async',
          loading: eager ? 'eager' : 'lazy'
        }
      );
    }

    function safeFocus(element) {
      if (!element || typeof element.focus !== 'function') return;

      try {
        element.focus({preventScroll: true});
      } catch (_) {
        /*
         * Non usiamo focus() come fallback perché sui browser meno recenti
         * potrebbe generare proprio lo scroll automatico che vogliamo evitare.
         */
      }
    }

    function featureList(items, compact) {
      return N(
        'ul',
        {
          class: compact
            ? 'amp-features amp-features--stack'
            : 'amp-features'
        },
        items.map(function (text) {
          return N(
            'li',
            {},
            [
              N(
                'span',
                {
                  class: 'amp-check',
                  'aria-hidden': 'true',
                  text: '✓'
                }
              ),
              N('span', {text: text})
            ]
          );
        })
      );
    }

    function reviews(stacked) {
      const list = N(
        'div',
        {
          class: stacked
            ? 'amp-reviews amp-reviews--stack'
            : 'amp-reviews'
        }
      );

      c.reviews.forEach(function (review) {
        const header = N(
          'div',
          {
            class: 'amp-review-header'
          },
          [
            N(
              'div',
              {},
              [
                N(
                  'p',
                  {
                    class: 'amp-review-name',
                    text: review.name
                  }
                ),
                N(
                  'time',
                  {
                    datetime: review.isoDate,
                    class: 'amp-review-date',
                    text: review.date
                  }
                )
              ]
            )
          ]
        );

        const googleImage = img(
          c.assets.google,
          'Google',
          'amp-google',
          false
        );

        if (googleImage) {
          header.append(googleImage);
        }

        const block = N(
          'article',
          {
            class: 'amp-review'
          },
          [header]
        );

        if (review.rating !== null) {
          block.append(
            N(
              'p',
              {
                class: 'amp-stars',
                'aria-label': review.rating + ' / 5',
                text:
                  '★'.repeat(review.rating) +
                  '☆'.repeat(5 - review.rating)
              }
            )
          );
        }

        block.append(
          N(
            'blockquote',
            {
              text: review.text
            }
          )
        );

        list.append(block);
      });

      return list;
    }

    function field(key, type, autocomplete) {
      const required = c.form.required.includes(key);
      const id = 'amp-field-' + key;

      const label = N(
        'label',
        {
          for: id,
          text:
            c.copy.labels[key] +
            (required ? ' *' : '')
        }
      );

      const input = N(
        'input',
        {
          id: id,
          type: type,
          'data-amp-field': key,
          autocomplete: autocomplete,
          required: required,
          placeholder: c.copy.placeholders[key],
          'aria-describedby': id + '-error',
          maxlength:
            key === 'email'
              ? 254
              : key === 'phone_number'
                ? 40
                : c.validation.nameMaxLength
        }
      );

      if (key === 'phone_number') {
        input.setAttribute('inputmode', 'tel');
      }

      const error = N(
        'p',
        {
          id: id + '-error',
          class: 'amp-field-error',
          hidden: true
        }
      );

      controls[key] = input;
      errors[key] = error;

      return N(
        'div',
        {
          class: 'amp-field'
        },
        [
          label,
          input,
          error
        ]
      );
    }

    function consentField(key, heading, text) {
      const required = c.form.required.includes(key);
      const id = 'amp-field-' + key;

      const input = N(
        'input',
        {
          type: 'checkbox',
          id: id,
          'data-amp-field': key,
          required: required,
          'aria-describedby': id + '-error'
        }
      );

      controls[key] = input;

      const label = N(
        'label',
        {
          for: id,
          class: 'amp-consent-label'
        },
        [
          input,
          N(
            'span',
            {
              text:
                heading +
                (required ? ' *' : '')
            }
          )
        ]
      );

      const group = N(
        'div',
        {
          class: 'amp-consent'
        },
        [label]
      );

      if (key === 'privacy_flag') {
        group.append(
          N(
            'p',
            {
              class: 'amp-consent-copy'
            },
            [
              N(
                'a',
                {
                  href: c.copy.privacyUrl,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  text: text
                }
              )
            ]
          )
        );
      } else {
        group.append(
          N(
            'details',
            {
              class: 'amp-consent-details'
            },
            [
              N(
                'summary',
                {
                  text: c.copy.more
                }
              ),
              N(
                'p',
                {
                  text: text
                }
              )
            ]
          )
        );
      }

      errors[key] = N(
        'p',
        {
          id: id + '-error',
          class: 'amp-field-error',
          hidden: true
        }
      );

      group.append(errors[key]);

      return group;
    }

    function mount() {
      U.assert(
        !d.getElementById(c.runtime.rootId),
        'UI_ROOT_DUPLICATE'
      );

      root.style.setProperty(
        '--amp-brand',
        c.theme.brand
      );

      root.style.setProperty(
        '--amp-brand-dark',
        c.theme.brandDark
      );

      root.style.setProperty(
        '--amp-surface',
        c.theme.surface
      );

      root.style.setProperty(
        '--amp-text',
        c.theme.text
      );

      root.style.setProperty(
        '--amp-max',
        c.theme.maxWidth
      );

      root.style.setProperty(
        '--amp-font',
        c.theme.fontFamily
      );

      const logoImage = img(
        c.assets.logo,
        c.assets.logoAlt,
        'amp-logo',
        true
      );

      const header = N(
        'header',
        {
          class: 'amp-header'
        },
        [
          N(
            'div',
            {
              class: 'amp-shell amp-header-inner'
            },
            logoImage ||
            N(
              'span',
              {
                class: 'amp-logo-text',
                text: c.assets.logoAlt
              }
            )
          )
        ]
      );

      const heroCopy = N(
        'div',
        {
          class: 'amp-hero-copy'
        },
        [
          N(
            'h1',
            {
              text: c.copy.heading
            }
          ),
          N(
            'p',
            {
              class: 'amp-intro',
              text: c.copy.intro
            }
          )
        ]
      );

      const heroInner = N(
        'div',
        {
          class: 'amp-shell amp-hero-inner'
        },
        [heroCopy]
      );

      const heroImage = img(
        c.assets.photo,
        c.assets.photoAlt,
        'amp-hero-photo',
        true
      );

      if (heroImage) {
        heroInner.append(heroImage);
      }

      const hero = N(
        'section',
        {
          class: 'amp-hero'
        },
        [heroInner]
      );

      const quizShell = N(
        'div',
        {
          class: 'amp-shell amp-quiz-shell'
        },
        [
          stepCard,
          featureList(
            c.copy.features,
            false
          )
        ]
      );

      const social = N(
        'section',
        {
          class: 'amp-social amp-shell',
          'aria-labelledby': 'amp-reviews-heading'
        },
        [
          N(
            'h2',
            {
              id: 'amp-reviews-heading',
              text: c.copy.reviewsHeading
            }
          ),
          reviews(false)
        ]
      );

      const bottom = N(
        'section',
        {
          class: 'amp-bottom amp-shell'
        },
        [
          N(
            'h2',
            {
              text: c.copy.bottomHeading
            }
          ),
          N(
            'button',
            {
              type: 'button',
              class: 'amp-button',
              'data-amp-action': 'start',
              text: c.copy.bottomCta
            }
          ),
          N(
            'p',
            {
              class: 'amp-disclaimer',
              text: c.copy.disclaimer
            }
          )
        ]
      );

      quizView.append(
        hero,
        quizShell,
        social,
        bottom
      );

      const left = N(
        'div',
        {
          class: 'amp-contact-information'
        },
        [
          N(
            'h1',
            {
              id: 'amp-contact-title',
              tabindex: '-1'
            },
            [
              N(
                'span',
                {
                  class: 'amp-congratulations',
                  text: c.copy.contactHeading
                }
              ),
              N(
                'span',
                {
                  text: c.copy.contactSubheading
                }
              )
            ]
          ),

          N(
            'h2',
            {
              class: 'amp-contact-reviews-title',
              text: c.copy.reviewsHeading
            }
          ),

          reviews(true),

          N(
            'h2',
            {
              class: 'amp-contact-features-title',
              text: c.copy.contactFeaturesHeading
            }
          ),

          featureList(
            c.copy.contactFeatures,
            true
          )
        ]
      );

      const right = N(
        'div',
        {
          class: 'amp-form-card'
        },
        [
          N(
            'div',
            {
              class: 'amp-form-heading'
            },
            [
              N(
                'h2',
                {
                  text: c.copy.formHeading
                }
              )
            ]
          )
        ]
      );

      form.append(
        N(
          'p',
          {
            class: 'amp-form-intro',
            text: c.copy.formIntro
          }
        )
      );

      form.append(
        field(
          'first_name',
          'text',
          'given-name'
        )
      );

      form.append(
        field(
          'last_name',
          'text',
          'family-name'
        )
      );

      form.append(
        field(
          'email',
          'email',
          'email'
        )
      );

      form.append(
        field(
          'phone_number',
          'tel',
          'tel'
        )
      );

      form.append(
        consentField(
          'privacy_flag',
          c.copy.privacyHeading,
          c.copy.privacyText
        )
      );

      form.append(
        consentField(
          'marketing_flag',
          c.copy.marketingHeading,
          c.copy.marketingText
        )
      );

      form.append(
        N(
          'p',
          {
            class: 'amp-callout',
            text: c.copy.callout
          }
        ),
        status,
        sendButton,
        N(
          'p',
          {
            class: 'amp-submit-note',
            text: c.copy.submitNote
          }
        )
      );

      right.append(form);

      contactView.append(
        contactBack,
        N(
          'div',
          {
            class: 'amp-contact-grid'
          },
          [
            left,
            right
          ]
        )
      );

      successView.append(
        N(
          'h1',
          {
            tabindex: '-1',
            text: c.copy.successHeading
          }
        ),
        N(
          'p',
          {
            text: c.copy.successText
          }
        )
      );

      content.append(
        quizView,
        contactView,
        successView
      );

      const footer = N(
        'footer',
        {
          class: 'amp-footer'
        },
        [
          N(
            'div',
            {
              class: 'amp-shell'
            },
            [
              N(
                'a',
                {
                  href: c.copy.cookiesUrl,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  'data-amp-action': 'link',
                  'data-amp-icmp': c.attribution.icmp.cookies || '',
                  text: c.copy.cookieLinkLabel
                }
              ),
              N(
                'a',
                {
                  href: c.copy.privacyUrl,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  'data-amp-action': 'link',
                  'data-amp-icmp': c.attribution.icmp.privacy || '',
                  text: c.copy.privacyLinkLabel
                }
              )
            ]
          )
        ]
      );

      root.append(
        header,
        content,
        footer
      );

      d.body.append(root);
      d.body.classList.add('amp-page-active');

      d.documentElement.lang = c.page.htmlLang;
      d.title = c.page.title;

      root.addEventListener(
        'click',
        function (event) {
          const button = event.target.closest(
            '[data-amp-action]'
          );

          if (
            !button ||
            !root.contains(button) ||
            button.disabled ||
            event.detail > 1
          ) {
            return;
          }

          const action = button.dataset.ampAction;

          if (action === 'link') {
            event.preventDefault();

            if (actions.link) {
              actions.link({
                href: button.getAttribute('href'),
                target: button.getAttribute('target'),
                icmp: button.dataset.ampIcmp || null
              });
            }

            return;
          }

          if (action === 'answer') {
            actions.answer &&
            actions.answer(
              button.dataset.ampStep,
              button.dataset.ampOption
            );
          }

          if (action === 'back') {
            actions.back &&
            actions.back();
          }

          /*
           * Nessuno scroll automatico.
           * La posizione della viewport rimane sotto controllo dell'utente.
           */
          if (action === 'start') {
            actions.start &&
            actions.start();
          }

          if (action === 'edit') {
            actions.edit &&
            actions.edit();
          }
        },
        {
          signal: signalOwner.signal
        }
      );

      form.addEventListener(
        'submit',
        function (event) {
          event.preventDefault();
          event.stopPropagation();

          if (actions.submit) {
            actions.submit(
              getContact()
            );
          }
        },
        {
          signal: signalOwner.signal
        }
      );

      return root;
    }

    function returnToQuestion() {
      if (!stepCard || stepCard.hidden) return;

      try {
        stepCard.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      } catch (_) {
        const top =
          stepCard.getBoundingClientRect().top +
          w.pageYOffset -
          18;

        w.scrollTo(0, Math.max(0, top));
      }

      const heading =
        stepCard.querySelector('#amp-question-title');

      if (heading) {
        setTimeout(function () {
          safeFocus(heading);
        }, 250);
      }
    }

    function showQuiz(step, state, focus) {
      current = step.id;

      quizView.hidden = false;
      contactView.hidden = true;
      successView.hidden = true;

      stepCard.replaceChildren();

      const nav = N(
        'div',
        {
          class: 'amp-step-top'
        }
      );

      if (state.path.length > 1) {
        nav.append(
          N(
            'button',
            {
              type: 'button',
              class: 'amp-back',
              'data-amp-action': 'back',
              text: '‹ ' + c.copy.back
            }
          )
        );
      }

      const heading = N(
        'h2',
        {
          id: 'amp-question-title',
          tabindex: '-1',
          text: step.title
        }
      );

      stepCard.append(
        nav,
        N(
          'div',
          {
            class: 'amp-question-heading'
          },
          [heading]
        )
      );

      if (state.rejected) {
        const rejection = N(
          'div',
          {
            class: 'amp-rejection',
            role: 'alert'
          },
          [
            N(
              'h3',
              {
                text: c.copy.rejectionHeading
              }
            ),
            N(
              'p',
              {
                text: c.copy.rejectionText
              }
            ),
            N(
              'button',
              {
                type: 'button',
                class: 'amp-button amp-button--outline',
                'data-amp-action': 'edit',
                text: c.copy.editAnswer
              }
            )
          ]
        );

        stepCard.append(rejection);
      } else if (step.type === 'choice') {
        const answers = N(
          'div',
          {
            class: 'amp-answers'
          }
        );

        step.options.forEach(function (option) {
          answers.append(
            N(
              'button',
              {
                type: 'button',
                class: 'amp-button',
                'data-amp-action': 'answer',
                'data-amp-step': step.id,
                'data-amp-option': option.id,
                'aria-pressed': String(
                  state.answers[step.id] &&
                  state.answers[step.id].optionId === option.id ||
                  false
                ),
                text: option.label
              }
            )
          );
        });

        stepCard.append(answers);
      } else {
        const zipForm = N(
          'form',
          {
            class: 'amp-postcode-form',
            novalidate: true
          }
        );

        const label = N(
          'label',
          {
            for: 'amp-postcode',
            class: 'amp-visually-hidden',
            text: c.copy.postcodeLabel
          }
        );

        const input = N(
          'input',
          {
            id: 'amp-postcode',
            inputmode: 'numeric',
            type: 'text',
            autocomplete: 'postal-code',
            placeholder: c.copy.postcodePlaceholder,
            'aria-describedby': 'amp-postcode-error'
          }
        );

        input.value = state.postcode || '';

        const error = N(
          'p',
          {
            id: 'amp-postcode-error',
            class: 'amp-field-error',
            hidden: true
          }
        );

        input.addEventListener(
          'input',
          function () {
            error.hidden = true;
            input.removeAttribute(
              'aria-invalid'
            );
          }
        );

        zipForm.append(
          label,
          input,
          error,
          N(
            'button',
            {
              type: 'submit',
              class: 'amp-button',
              text: c.copy.next
            }
          )
        );

        zipForm.addEventListener(
          'submit',
          function (event) {
            event.preventDefault();
            event.stopPropagation();

            if (actions.postcode) {
              actions.postcode(
                step.id,
                input.value
              );
            }
          }
        );

        stepCard.append(zipForm);
      }

      const progress = N(
        'ol',
        {
          class: 'amp-progress',
          'aria-label': c.copy.progressLabel
        }
      );

      c.funnel.steps.forEach(
        function (entry, index) {
          const visited =
            state.path.includes(entry.id);

          progress.append(
            N(
              'li',
              {
                class:
                  visited
                    ? 'is-visited'
                    : '',
                'aria-current':
                  entry.id === current
                    ? 'step'
                    : null
              },
              [
                N(
                  'span',
                  {
                    text: String(index + 1)
                  }
                )
              ]
            )
          );
        }
      );

      stepCard.append(progress);

      if (focus) {
        safeFocus(heading);
      }
    }

    function postcodeError() {
      const input =
        root.querySelector('#amp-postcode');

      const error =
        root.querySelector('#amp-postcode-error');

      if (error) {
        error.textContent =
          c.copy.errors.postcode;

        error.hidden = false;
      }

      if (input) {
        input.setAttribute(
          'aria-invalid',
          'true'
        );

        safeFocus(input);
      }
    }

    function showContact(focus) {
      current = 'contact';

      quizView.hidden = true;
      contactView.hidden = false;
      successView.hidden = true;

      if (focus) {
        safeFocus(
          contactView.querySelector('h1')
        );
      }
    }

    function getContact() {
      const values = {};

      Object.entries(controls).forEach(
        function ([key, input]) {
          values[key] =
            input.type === 'checkbox'
              ? input.checked
              : input.value;
        }
      );

      return values;
    }

    function setErrors(values) {
      Object.keys(errors).forEach(
        function (key) {
          errors[key].textContent =
            values[key] || '';

          errors[key].hidden =
            !values[key];

          if (values[key]) {
            controls[key].setAttribute(
              'aria-invalid',
              'true'
            );
          } else {
            controls[key].removeAttribute(
              'aria-invalid'
            );
          }
        }
      );

      const first = Object.keys(controls).find(
        function (key) {
          return values[key];
        }
      );

      if (first) {
        safeFocus(
          controls[first]
        );
      }
    }

    function setStatus(state, message) {
      const busy = [
        'validating',
        'submitting',
        'unknown',
        'succeeded'
      ].includes(state);

      sendButton.disabled = busy;
      contactBack.disabled = busy;

      form.setAttribute(
        'aria-busy',
        String(
          state === 'validating' ||
          state === 'submitting'
        )
      );

      Object.values(controls).forEach(
        function (input) {
          input.disabled = busy;
        }
      );

      sendButton.textContent =
        state === 'submitting'
          ? c.copy.sending
          : c.copy.submit;

      status.textContent =
        message || '';

      status.hidden =
        !message;

      status.classList.toggle(
        'is-error',
        [
          'failed',
          'unknown',
          'blocked'
        ].includes(state)
      );
    }

    function showSuccess() {
      quizView.hidden = true;
      contactView.hidden = true;
      successView.hidden = false;

      safeFocus(
        successView.querySelector('h1')
      );

      form.reset();
    }

    function destroy() {
      signalOwner.abort();
      root.remove();

      d.body.classList.remove(
        'amp-page-active'
      );

      d.documentElement.lang =
        original.lang;

      d.title =
        original.title;
    }

    return {
      mount: mount,
      bind: function (value) {
        actions = value;
      },
      showQuiz: showQuiz,
      showContact: showContact,
      returnToQuestion: returnToQuestion,
      postcodeError: postcodeError,
      getContact: getContact,
      setErrors: setErrors,
      setStatus: setStatus,
      showSuccess: showSuccess,
      destroy: destroy
    };
  }

  App.modules.renderer = {
    create: create
  };
})(window, document);
