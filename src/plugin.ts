import { onArrowLeft, onArrowRight } from "./actions";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { NodeType } from "prosemirror-model";
import { nodeIsInSet, safeResolve } from "./utils";

export const KEY = 'Nodemark';
export const PLUGIN_KEY = new PluginKey(KEY);

export interface NodemarkOption {
  nodeType: NodeType;
}

export interface NodemarkState {
  active: boolean;
}

function createDefaultState(): NodemarkState {
  return { active: false };
}

function toDom(): Node {
  const span = document.createElement('span');
  span.classList.add('nodemark-fake-cursor');
  return span;
}

export function getNodemarkPlugin(opts: NodemarkOption) {
  const plugin: Plugin<NodemarkState> = new Plugin<NodemarkState>({
    key: PLUGIN_KEY,
    view() {
      return {
        update: (view) => {
          const state = plugin.getState(view.state) as NodemarkState;
          view.dom.classList[state?.active ? 'add' : 'remove']('nodemark-no-cursor');
        },
      }
    },
    props: {
      decorations: (state) => {
        const { active } = plugin.getState(state) ?? {};
        if (!active) return DecorationSet.empty;
        const deco = Decoration.widget(state.selection.from, toDom, { side: 0 });
        return DecorationSet.create(state.doc, [deco]);        
      },
      handleKeyDown(view, event) {
        switch(event.key) {
          case 'ArrowRight':
            return onArrowRight(view, plugin, event, opts.nodeType);
          case 'ArrowLeft':
            return onArrowLeft(view, plugin, event, opts.nodeType);
          default:
            return false;
        }
      },
      handleTextInput(view, from, to, text) {
        const { active } = plugin.getState(view.state);
        if (!active) return false;

        const { selection } = view.state;
        console.debug('nodemark: props->handleTextInput', `position: from ${selection.from} to ${selection.to}`);
        console.debug('nodemark: props->handleTextInput', `args: from ${from} to ${to}: ${text}`);

        const tr = view.state.tr.insertText(text, selection.from);
        view.dispatch(tr);
        const tr2 = view.composing ?
          view.state.tr.setSelection(new TextSelection(safeResolve(view.state.doc, selection.from), safeResolve(view.state.doc, selection.from+1))) :
          view.state.tr.setSelection(new TextSelection(safeResolve(view.state.doc, selection.from+1), safeResolve(view.state.doc, selection.from+1)));
        view.dispatch(tr2);

        return true;
      }
    },
    state: {
      init: createDefaultState,
      apply(tr, value, oldState, newState) {
        // const { selection, doc } = newState;
        // const { nodeType } = opts;
        // console.log('nodemark: state->apply', `new state selection: from ${selection.from}, to ${selection.to}`);
        
        // if (!selection.empty) return createDefaultState();
        
        // const currentInNode = nodeIsInSet(doc, selection.from, nodeType);
        // const left1stInNode = nodeIsInSet(doc, selection.from-1, nodeType);
        // const right1stInNode = nodeIsInSet(doc, selection.from+1, nodeType);

        // // outside |<node>inside</node> outside
        // if (!currentInNode && right1stInNode) return { active: true };

        // // outside <node>|inside</node> outside
        // if (!left1stInNode && currentInNode) return { active: true };

        // // outside <node>inside|</node> outside
        // if (currentInNode && !right1stInNode) return { active: true };

        // // outside <node>inside</node>| outside
        // if (left1stInNode && !currentInNode) return { active: true };
        
        // // else
        // return { active: false };

        const meta = tr.getMeta(plugin);
        if (!!meta?.active) return { active: true };
        else return createDefaultState();
      }
    },
    appendTransaction: (transactions, oldState, newState) => {
      return null;
    }
  });
  return plugin;
};