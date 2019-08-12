// Styles
import './VFeatureDiscovery.sass'

// Mixins
import Colorable from '../../mixins/colorable'
import Elevatable from '../../mixins/elevatable'
import Toggleable from '../../mixins/toggleable'
import Themeable from '../../mixins/themeable'

// Types
import { VNode } from 'vue'
import mixins, { ExtractVue } from '../../util/mixins'

// Directives
import ClickOutside from '../../directives/click-outside'

// Helpers
import { convertToUnit, keyCodes, getSlot } from '../../util/helpers'
import { PropValidator } from 'vue/types/options'

const doubledSqrt2 = 2.8284

const baseMixins = mixins(
  Colorable,
  Elevatable,
  Toggleable,
  Themeable
)

interface options extends ExtractVue<typeof baseMixins> {
  $refs: {
    target: HTMLElement
  }
}

/* @vue/component */
export default baseMixins.extend<options>().extend({
  name: 'v-feature-discovery',

  directives: { ClickOutside },

  props: {
    persistent: Boolean,
    flat: Boolean,
    color: {
      type: String,
      default: 'primary'
    },
    highlightColor: {
      type: String,
      default: 'white'
    },
    size: {
      default: 700,
      type: [Number, String],
      validator: (v: string | number) => !isNaN(parseInt(v))
    },
    target: {
      default: null as string | HTMLElement | null
    } as PropValidator<string | HTMLElement>,
    value: {
      default: true
    },
    noRipple: {
      default: false,
      type: Boolean
    },
    textColor: {
      type: String,
      default: 'white'
    }
  },

  data: () => ({
    rect: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      height: 0,
      width: 0
    },
    targetEl: null as HTMLElement | null
  }),

  computed: {
    classes (): object {
      return {
        'v-feature-discovery--flat': this.flat,
        'v-feature-discovery--active': this.isActive,
        'v-feature-discovery--lr-shifted': this.leftShift !== 0,
        'v-feature-discovery--no-ripple': this.noRipple,
        ...this.themeClasses
      }
    },
    computedLeft (): number {
      return this.rect.left - (this.computedSize / 2) + (this.rect.width / 2)
    },
    computedRight (): number {
      return window.innerWidth - this.rect.right - (this.computedSize / 2) + (this.rect.width / 2)
    },
    shiftedLeft (): number {
      return this.computedLeft + this.leftShift
    },
    computedBottom (): number {
      return window.innerHeight - this.rect.bottom - (this.computedSize / 2) + (this.rect.height / 2)
    },
    computedTop (): number {
      return this.rect.top - (this.computedSize / 2) + (this.rect.height / 2)
    },
    shiftedTop (): number {
      return this.computedTop + this.topShift
    },
    computedSize (): number {
      return parseInt(this.size)
    },
    styles (): object {
      return {
        left: convertToUnit(this.shiftedLeft),
        top: convertToUnit(this.shiftedTop),
        height: convertToUnit(this.computedSize),
        width: convertToUnit(this.computedSize)
      }
    },
    rectSize (): number {
      return Math.max(this.rect.width, this.rect.height)
    },
    highlightSize (): number {
      return Math.sqrt(2 * (this.rectSize + this.highlightPadding) ** 2)
    },
    highlightPadding (): number {
      return this.rectSize / 3.5
    },
    baseShift (): number {
      return this.computedSize / doubledSqrt2 * 0.75
    },
    leftShift (): number {
      if (this.computedLeft === this.computedRight) return 0
      if (this.computedLeft < 0 && this.computedLeft < this.computedRight) return this.baseShift
      if (this.computedRight < 0) return -this.baseShift
      return 0
    },
    topShift (): number {
      if (this.computedTop === this.computedBottom) return 0
      if (this.computedTop < 0 && this.computedTop < this.computedBottom) return this.baseShift
      if (this.computedBottom < 0) return -this.baseShift
      return 0
    },
    backdropStyle (): object {
      const out = {
        'transform-origin': `calc(50% - ${convertToUnit(this.leftShift)}) calc(50% - ${convertToUnit(this.topShift)})`
      } as { [key: string]: any }

      if (this.leftShift > 0) {
        out['justify-content'] = 'flex-end'
        out['padding-right'] = '15%'
      }
      if (this.leftShift < 0) {
        out['justify-content'] = 'flex-start'
        out['padding-left'] = '15%'
      }

      return out
    },
    contentStyle (): object {
      let justify = 'space-between'
      if (this.topShift > 0) justify = 'flex-end'
      if (this.topShift < 0) justify = 'flex-start'

      return {
        'justify-content': justify
      }
    },
    attrs (): object {
      return {
        'aria-hidden': !this.isActive
      }
    }
  },

  watch: {
    target () {
      this.updateTarget()
    },
    targetEl () {
      if (this.targetEl) {
        const newTarget = this.targetEl.cloneNode(true) as HTMLElement
        newTarget.style.cssText = window.getComputedStyle(this.targetEl).cssText
        newTarget.style.color = ''
        newTarget.style.webkitTextFillColor = ''
        newTarget.style.cssFloat = ''
        newTarget.style.margin = ''
        newTarget.style.top = ''
        newTarget.style.bottom = ''
        newTarget.style.left = ''
        newTarget.style.right = ''
        newTarget.classList.add(this.color + '--text')
        if (newTarget.style.position === 'fixed') {
          newTarget.style.position = 'static'
        }

        while (this.$refs.target.firstChild) {
          this.$refs.target.firstChild.remove()
        }
        this.$refs.target.appendChild(newTarget)
      }
    },
    isActive (val: boolean) {
      val && this.updateRect()
    }
  },

  mounted () {
    this.updateTarget()

    window.addEventListener('scroll', this.updateRect)
    window.addEventListener('resize', this.updateRect)
    window.addEventListener('keyup', this.keyPress)
  },

  methods: {
    keyPress (e: KeyboardEvent) {
      if (this.closeConditional() && e.keyCode === keyCodes.esc) this.isActive = false
    },
    updateTarget () {
      if (this.target instanceof HTMLElement) this.targetEl = this.target
      else this.targetEl = document.querySelector(this.target)

      if (!this.targetEl) return

      this.rect = this.targetEl.getBoundingClientRect()
    },
    updateRect () {
      if (!this.targetEl || !this.isActive) return

      this.rect = this.targetEl.getBoundingClientRect()
    },
    closeConditional (): boolean {
      return !this.persistent && this.isActive
    },
    genBackdrop (): VNode {
      return this.$createElement('div', this.setBackgroundColor(this.color, {
        staticClass: 'v-feature-discovery__backdrop',
        class: this.elevationClasses,
        style: this.backdropStyle
      }), [ this.genContent() ])
    },
    genContent (): VNode {
      return this.$createElement('div', this.setTextColor(this.textColor, {
        staticClass: 'v-feature-discovery__content',
        style: this.contentStyle
      }), [
        this.genWrapper(),
        this.genActions()
      ])
    },
    genActions (): VNode {
      return this.$createElement('div', {
        staticClass: 'v-feature-discovery__actions'
      }, getSlot(this, 'actions', {
        close: () => {
          if (this.closeConditional()) this.isActive = false
        }
      }, true))
    },
    genWrapper (): VNode {
      return this.$createElement('div', {
        staticClass: 'v-feature-discovery__wrapper'
      }, [
        this.$createElement('div', {
          staticClass: 'v-feature-discovery__title'
        }, getSlot(this, 'title')),
        this.$createElement('div', {
          staticClass: 'v-feature-discovery__text'
        }, getSlot(this, 'default'))
      ])
    },
    genChildren (): VNode[] {
      return [
        this.genBackdrop(),
        this.genHighlight()
      ]
    },
    genHighlight (): VNode {
      return this.$createElement('div', this.setTextColor(this.color, this.setBackgroundColor(this.highlightColor, {
        staticClass: 'v-feature-discovery__highlight',
        style: {
          top: `calc(50% - (${convertToUnit(this.highlightSize)} / 2) - ${convertToUnit(this.topShift)})`,
          left: `calc(50% - (${convertToUnit(this.highlightSize)} / 2) - ${convertToUnit(this.leftShift)})`,
          height: convertToUnit(this.highlightSize),
          width: convertToUnit(this.highlightSize)
        },
        attrs: {
          'aria-hidden': true
        }
      })), [this.$createElement('div', {
        ref: 'target',
        staticClass: 'v-feature-discovery__target'
      })])
    }
  },

  render (h): VNode {
    const data = {
      staticClass: 'v-feature-discovery',
      directives: [
        {
          name: 'click-outside',
          value: () => /* istanbul ignore next */ (this.isActive = false),
          args: {
            closeConditional: this.closeConditional
          }
        }
      ],
      class: this.classes,
      style: this.styles,
      attrs: this.attrs
    }

    return h('div', data, this.genChildren())
  }
})
