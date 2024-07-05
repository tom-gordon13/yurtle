
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    /**
     * Schedules a callback to run immediately before the component is unmounted.
     *
     * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
     * only one that runs inside a server-side component.
     *
     * https://svelte.dev/docs#run-time-svelte-ondestroy
     */
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/LetterBoxRow.svelte generated by Svelte v3.59.2 */

    const file$2 = "src/LetterBoxRow.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	child_ctx[5] = i;
    	return child_ctx;
    }

    // (8:2) {#each Array.from({ length: wordLength }) as _, i}
    function create_each_block$1(ctx) {
    	let div;

    	let t0_value = (/*word*/ ctx[2] && /*word*/ ctx[2].length > /*i*/ ctx[5]
    	? /*word*/ ctx[2][/*i*/ ctx[5]]
    	: "") + "";

    	let t0;
    	let t1;
    	let div_class_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();

    			attr_dev(div, "class", div_class_value = "letter-box " + (/*word*/ ctx[2] && /*word*/ ctx[2].length === /*wordLength*/ ctx[0] && /*word*/ ctx[2][/*i*/ ctx[5]] === /*wordToGuess*/ ctx[1][/*i*/ ctx[5]]
    			? 'correct-letter'
    			: '') + " svelte-1fk3psf");

    			add_location(div, file$2, 8, 4, 175);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*word*/ 4 && t0_value !== (t0_value = (/*word*/ ctx[2] && /*word*/ ctx[2].length > /*i*/ ctx[5]
    			? /*word*/ ctx[2][/*i*/ ctx[5]]
    			: "") + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*word, wordLength, wordToGuess*/ 7 && div_class_value !== (div_class_value = "letter-box " + (/*word*/ ctx[2] && /*word*/ ctx[2].length === /*wordLength*/ ctx[0] && /*word*/ ctx[2][/*i*/ ctx[5]] === /*wordToGuess*/ ctx[1][/*i*/ ctx[5]]
    			? 'correct-letter'
    			: '') + " svelte-1fk3psf")) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(8:2) {#each Array.from({ length: wordLength }) as _, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let each_value = Array.from({ length: /*wordLength*/ ctx[0] });
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "row-container svelte-1fk3psf");
    			add_location(div, file$2, 6, 0, 90);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div, null);
    				}
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*word, wordLength, wordToGuess*/ 7) {
    				each_value = Array.from({ length: /*wordLength*/ ctx[0] });
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('LetterBoxRow', slots, []);
    	let { wordLength } = $$props;
    	let { wordToGuess } = $$props;
    	let { word } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (wordLength === undefined && !('wordLength' in $$props || $$self.$$.bound[$$self.$$.props['wordLength']])) {
    			console.warn("<LetterBoxRow> was created without expected prop 'wordLength'");
    		}

    		if (wordToGuess === undefined && !('wordToGuess' in $$props || $$self.$$.bound[$$self.$$.props['wordToGuess']])) {
    			console.warn("<LetterBoxRow> was created without expected prop 'wordToGuess'");
    		}

    		if (word === undefined && !('word' in $$props || $$self.$$.bound[$$self.$$.props['word']])) {
    			console.warn("<LetterBoxRow> was created without expected prop 'word'");
    		}
    	});

    	const writable_props = ['wordLength', 'wordToGuess', 'word'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<LetterBoxRow> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('wordLength' in $$props) $$invalidate(0, wordLength = $$props.wordLength);
    		if ('wordToGuess' in $$props) $$invalidate(1, wordToGuess = $$props.wordToGuess);
    		if ('word' in $$props) $$invalidate(2, word = $$props.word);
    	};

    	$$self.$capture_state = () => ({ wordLength, wordToGuess, word });

    	$$self.$inject_state = $$props => {
    		if ('wordLength' in $$props) $$invalidate(0, wordLength = $$props.wordLength);
    		if ('wordToGuess' in $$props) $$invalidate(1, wordToGuess = $$props.wordToGuess);
    		if ('word' in $$props) $$invalidate(2, word = $$props.word);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [wordLength, wordToGuess, word];
    }

    class LetterBoxRow extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { wordLength: 0, wordToGuess: 1, word: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LetterBoxRow",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get wordLength() {
    		throw new Error("<LetterBoxRow>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set wordLength(value) {
    		throw new Error("<LetterBoxRow>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get wordToGuess() {
    		throw new Error("<LetterBoxRow>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set wordToGuess(value) {
    		throw new Error("<LetterBoxRow>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get word() {
    		throw new Error("<LetterBoxRow>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set word(value) {
    		throw new Error("<LetterBoxRow>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/LetterBoxContainer.svelte generated by Svelte v3.59.2 */
    const file$1 = "src/LetterBoxContainer.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	child_ctx[7] = i;
    	return child_ctx;
    }

    // (12:4) {#each Array.from({ length: numRows }) as _, i}
    function create_each_block(ctx) {
    	let letterboxrow;
    	let current;

    	letterboxrow = new LetterBoxRow({
    			props: {
    				wordLength: /*wordLength*/ ctx[0],
    				wordToGuess: /*wordToGuess*/ ctx[4],
    				word: /*i*/ ctx[7] === /*guessList*/ ctx[3].length
    				? /*currGuess*/ ctx[2]
    				: /*guessList*/ ctx[3][/*i*/ ctx[7]]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(letterboxrow.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(letterboxrow, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const letterboxrow_changes = {};
    			if (dirty & /*wordLength*/ 1) letterboxrow_changes.wordLength = /*wordLength*/ ctx[0];
    			if (dirty & /*wordToGuess*/ 16) letterboxrow_changes.wordToGuess = /*wordToGuess*/ ctx[4];

    			if (dirty & /*guessList, currGuess*/ 12) letterboxrow_changes.word = /*i*/ ctx[7] === /*guessList*/ ctx[3].length
    			? /*currGuess*/ ctx[2]
    			: /*guessList*/ ctx[3][/*i*/ ctx[7]];

    			letterboxrow.$set(letterboxrow_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(letterboxrow.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(letterboxrow.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(letterboxrow, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(12:4) {#each Array.from({ length: numRows }) as _, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let current;
    	let each_value = Array.from({ length: /*numRows*/ ctx[1] });
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "box-container svelte-12wrs7");
    			add_location(div, file$1, 10, 0, 206);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div, null);
    				}
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*wordLength, wordToGuess, guessList, currGuess, numRows*/ 31) {
    				each_value = Array.from({ length: /*numRows*/ ctx[1] });
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('LetterBoxContainer', slots, []);
    	let { wordLength } = $$props;
    	let { numRows } = $$props;
    	let { currGuess } = $$props;
    	let { guessList } = $$props;
    	let { wordToGuess } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (wordLength === undefined && !('wordLength' in $$props || $$self.$$.bound[$$self.$$.props['wordLength']])) {
    			console.warn("<LetterBoxContainer> was created without expected prop 'wordLength'");
    		}

    		if (numRows === undefined && !('numRows' in $$props || $$self.$$.bound[$$self.$$.props['numRows']])) {
    			console.warn("<LetterBoxContainer> was created without expected prop 'numRows'");
    		}

    		if (currGuess === undefined && !('currGuess' in $$props || $$self.$$.bound[$$self.$$.props['currGuess']])) {
    			console.warn("<LetterBoxContainer> was created without expected prop 'currGuess'");
    		}

    		if (guessList === undefined && !('guessList' in $$props || $$self.$$.bound[$$self.$$.props['guessList']])) {
    			console.warn("<LetterBoxContainer> was created without expected prop 'guessList'");
    		}

    		if (wordToGuess === undefined && !('wordToGuess' in $$props || $$self.$$.bound[$$self.$$.props['wordToGuess']])) {
    			console.warn("<LetterBoxContainer> was created without expected prop 'wordToGuess'");
    		}
    	});

    	const writable_props = ['wordLength', 'numRows', 'currGuess', 'guessList', 'wordToGuess'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<LetterBoxContainer> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('wordLength' in $$props) $$invalidate(0, wordLength = $$props.wordLength);
    		if ('numRows' in $$props) $$invalidate(1, numRows = $$props.numRows);
    		if ('currGuess' in $$props) $$invalidate(2, currGuess = $$props.currGuess);
    		if ('guessList' in $$props) $$invalidate(3, guessList = $$props.guessList);
    		if ('wordToGuess' in $$props) $$invalidate(4, wordToGuess = $$props.wordToGuess);
    	};

    	$$self.$capture_state = () => ({
    		LetterBoxRow,
    		wordLength,
    		numRows,
    		currGuess,
    		guessList,
    		wordToGuess
    	});

    	$$self.$inject_state = $$props => {
    		if ('wordLength' in $$props) $$invalidate(0, wordLength = $$props.wordLength);
    		if ('numRows' in $$props) $$invalidate(1, numRows = $$props.numRows);
    		if ('currGuess' in $$props) $$invalidate(2, currGuess = $$props.currGuess);
    		if ('guessList' in $$props) $$invalidate(3, guessList = $$props.guessList);
    		if ('wordToGuess' in $$props) $$invalidate(4, wordToGuess = $$props.wordToGuess);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [wordLength, numRows, currGuess, guessList, wordToGuess];
    }

    class LetterBoxContainer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			wordLength: 0,
    			numRows: 1,
    			currGuess: 2,
    			guessList: 3,
    			wordToGuess: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LetterBoxContainer",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get wordLength() {
    		throw new Error("<LetterBoxContainer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set wordLength(value) {
    		throw new Error("<LetterBoxContainer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get numRows() {
    		throw new Error("<LetterBoxContainer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set numRows(value) {
    		throw new Error("<LetterBoxContainer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get currGuess() {
    		throw new Error("<LetterBoxContainer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currGuess(value) {
    		throw new Error("<LetterBoxContainer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get guessList() {
    		throw new Error("<LetterBoxContainer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set guessList(value) {
    		throw new Error("<LetterBoxContainer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get wordToGuess() {
    		throw new Error("<LetterBoxContainer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set wordToGuess(value) {
    		throw new Error("<LetterBoxContainer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.59.2 */
    const file = "src/App.svelte";

    // (51:2) {#if userWin}
    function create_if_block(ctx) {
    	let div;
    	let t1;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "You win!";
    			t1 = space();
    			button = element("button");
    			button.textContent = "Play Again";
    			add_location(div, file, 51, 4, 1140);
    			add_location(button, file, 52, 4, 1164);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*handleReset*/ ctx[4], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(51:2) {#if userWin}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let letterboxcontainer;
    	let t;
    	let current;
    	let mounted;
    	let dispose;

    	letterboxcontainer = new LetterBoxContainer({
    			props: {
    				wordLength,
    				numRows,
    				currGuess: /*currGuess*/ ctx[0],
    				guessList: /*guessList*/ ctx[1],
    				wordToGuess: /*wordToGuess*/ ctx[3]
    			},
    			$$inline: true
    		});

    	let if_block = /*userWin*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(letterboxcontainer.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "top-container svelte-1ugpel0");
    			add_location(div, file, 42, 0, 957);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(letterboxcontainer, div, null);
    			append_dev(div, t);
    			if (if_block) if_block.m(div, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div, "keydown", /*handleKeydown*/ ctx[5], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const letterboxcontainer_changes = {};
    			if (dirty & /*currGuess*/ 1) letterboxcontainer_changes.currGuess = /*currGuess*/ ctx[0];
    			if (dirty & /*guessList*/ 2) letterboxcontainer_changes.guessList = /*guessList*/ ctx[1];
    			letterboxcontainer.$set(letterboxcontainer_changes);

    			if (/*userWin*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(letterboxcontainer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(letterboxcontainer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(letterboxcontainer);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const wordLength = 5;
    const numRows = 5;

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let currGuess = "";
    	let guessList = [];
    	let wordToGuess = "trick";
    	let userWin = false;

    	function handleReset() {
    		$$invalidate(2, userWin = false);
    		$$invalidate(0, currGuess = "");
    		$$invalidate(1, guessList = []);
    	}

    	function handleKeydown(event) {
    		if (userWin) return;
    		const key = event.key;

    		if (key === "Backspace") {
    			$$invalidate(0, currGuess = currGuess.slice(0, -1));
    		} else if (currGuess.length < wordLength && (/^[a-zA-Z]$/).test(key)) {
    			$$invalidate(0, currGuess += key);
    		}

    		if (currGuess.length === wordLength) {
    			if (currGuess === wordToGuess) $$invalidate(2, userWin = true);
    			guessList.push(currGuess);
    			$$invalidate(0, currGuess = "");
    		}
    	}

    	onMount(() => {
    		window.addEventListener("keydown", handleKeydown);
    	});

    	onDestroy(() => {
    		window.removeEventListener("keydown", handleKeydown);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		LetterBoxContainer,
    		onMount,
    		onDestroy,
    		wordLength,
    		numRows,
    		currGuess,
    		guessList,
    		wordToGuess,
    		userWin,
    		handleReset,
    		handleKeydown
    	});

    	$$self.$inject_state = $$props => {
    		if ('currGuess' in $$props) $$invalidate(0, currGuess = $$props.currGuess);
    		if ('guessList' in $$props) $$invalidate(1, guessList = $$props.guessList);
    		if ('wordToGuess' in $$props) $$invalidate(3, wordToGuess = $$props.wordToGuess);
    		if ('userWin' in $$props) $$invalidate(2, userWin = $$props.userWin);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [currGuess, guessList, userWin, wordToGuess, handleReset, handleKeydown];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
