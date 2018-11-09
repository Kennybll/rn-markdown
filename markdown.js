
import React, { Component } from 'react'
import {
  View,
  Text,
  ScrollView,
} from 'react-native'

import { parse } from './parser'
import DEFAULT_STYLES from './styles'
import List from './components/list'
import Image from './components/image'
import LineBreak from './components/linebreak'
import pick from 'object.pick'
import omit from 'object.omit'
import {
  text as TextStyleProps,
  view as ViewStyleProps
} from './style-props'

import {
  name as packageName
} from './package.json'

const log = (...args) => {
  args.unshift(packageName)
  return console.log(...args)
}

const TextOnlyStyleProps = (function () {
  const props = {}
  TextStyleProps.forEach(prop => {
    props[prop] = true
  })

  ViewStyleProps.forEach(prop => {
    delete props[prop]
  })

  return Object.keys(props)
}())

const DEFAULT_PADDING = 10

// const WrappedText = ({ ...props })  => {
//   return (
//     <View>
//       <Text {...props}></Text>
//     </View>
//   )
// }

const DEFAULT_RENDERERS = {
  container: ScrollView,
  text: Text,
  br: LineBreak,
}

const DEFAULT_CUSTOM_RENDERERS = {
  image: Image,
  list: List
}

export default function createMarkdownRenderer (markedOpts) {
  const typeToRenderer = {
    ...DEFAULT_RENDERERS,
    ...DEFAULT_CUSTOM_RENDERERS
  }

  function renderGroup ({ markdown, markdownStyles={}, style, key, passThroughProps }) {
    const { type, children, ordered, depth, text } = markdown

    let El = typeToRenderer[type]
    if (!El) {
      El = View
    }

    const isText = type === 'text'
    let elStyles = getStyles({ markdown, markdownStyles, textOnly: isText })
    // only for the container
    if (isText) {
      const ancestorStyles = getAncestorTextStyles({ markdown, markdownStyles })
      // counterintuitive, but works better
      elStyles = elStyles.concat(ancestorStyles)
    }

    if (style) elStyles.push(style)

    let contents
    if (isText) {
      contents = text
    } else if (children) {
      contents = children.map((group, i) => {
        return renderGroup({
          markdown: group,
          markdownStyles,
          key: `child-${i}`,
          passThroughProps
        })
      })
    }

    const elProps = {
      style: flatten(elStyles),
      // styles,
      // markdown,
      key,
      passThroughProps
    }

    if (El !== DEFAULT_RENDERERS[type]) {
      elProps.markdown = markdown
    }

    return (
      <El {...elProps}>
        {contents}
      </El>
    )
  }

  const Markdown = ({ children, passThroughProps={}, ...rest }) => {
    const parsed = parse(children, markedOpts)
    return renderGroup({ markdown: parsed, passThroughProps, ...rest })
  }

  // allow override renderers and textContainers for this markdown instance
  Markdown.renderer = typeToRenderer
  return Markdown
}

function getStyles ({ markdown, markdownStyles, textOnly }) {
  const { type, depth } = markdown
  const styleNames = [type]
  if (type === 'heading') styleNames.push(type + depth)

  return styleNames
    .map(styleName => {
      const defaultStyle = DEFAULT_STYLES[styleName]
      if (!defaultStyle) {
        log(`don't have style mapping for "${styleName}"`)
      }

      return defaultStyle
    })
    .concat(styleNames.map(styleName => markdownStyles[styleName]))
    .filter(style => style != null)
    .map(style => {
      if (typeof style !== 'object') return style

      if (textOnly) {
        return pick(style, TextOnlyStyleProps)
      }

      return omit(style, TextOnlyStyleProps)
    })
}

function getAncestorTextStyles ({ markdown, markdownStyles }) {
  let textStyles = []
  let current = markdown
  while (current = current.parent) {
    textStyles = getStyles({
      markdown: current,
      markdownStyles,
      textOnly: true
    }).concat(textStyles)
  }

  return textStyles
}

function flatten (styleArray) {
  return styleArray.reduce((flat, next) => {
    return { ...flat, ...next }
  }, {})
}

// allow override defaults
export const renderer = DEFAULT_RENDERERS
