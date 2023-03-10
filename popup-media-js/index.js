"use strict"

import "./assets/css/style.css"
import { classNames, defaultConfigValues, defaultValues } from "./config"

export default class PopupMedia {
  static run(config) {
    const popupWindow = new PopupMedia(config)
    popupWindow.show()

    return popupWindow._boxElem
  }

  options = {
    width: defaultConfigValues.width,
    height: defaultConfigValues.height,

    type: defaultConfigValues.type,
    url: "",
  }

  _params = {
    enableDragging: false,
    startMousePosition: {
      X: 0,
      Y: 0,
    },
    startBoxPosition: {
      X: 0,
      Y: 0,
    },
  }

  constructor(config) {
    this.setConfig(config)
  }

  setConfig(config) {
    this.options = { ...defaultConfigValues, ...config }
  }

  async _removeLoading() {
    if (!this.options.hasLoading) return
    const loading = this._loadingElem
    if (!loading) return

    const callbackStyle = () => (loading.style.opacity = "0%")
    await this._addStyleWithTransition(loading, callbackStyle)
    loading.remove()
  }

  _appendLoading() {
    this._bodyElem.insertAdjacentHTML("afterbegin", this._generateLoadingHTML)

    const loading = this._loadingElem
    //avoid batching reflows
    loading.offsetWidth

    loading.style.opacity = "100%"
  }

  _renderHeader() {
    if (!this.options.hasHeader) return

    this._boxElem.classList.add(classNames.hasHeader)
    this._boxElem.insertAdjacentHTML("afterbegin", this._generateBoxHeaderHTML)

    if (this.options.hasBtnClose) {
      this._headerElem.insertAdjacentHTML("beforeend", this._generateBtnCloseHTML)
    }

    if (this.options.hasBtnFullscreen && this.options.type !== "audio") {
      this._headerElem
        .querySelector("p")
        ?.insertAdjacentHTML("afterend", this._generateFullscreenButtonHTML)
    }

    if (this.options.hasBtnHelp) {
      this._headerElem
        .querySelector("p")
        ?.insertAdjacentHTML("afterend", this._generateHelpButtonHTML)
    }

    if (this.options.hasBtnSave) {
      this._headerElem
        .querySelector("p")
        ?.insertAdjacentHTML("afterend", this._generateSaveButtonHTML)
    }
  }

  show() {
    this.close() // close if popup exist

    const body = window.document.body
    body.insertAdjacentHTML("beforeend", this._generateMainBoxHTML)

    if (this.options.hasLoading) this._appendLoading()

    this._renderHeader()

    if (this.options.isDraggable) this._draggableEvent()
    if (this.options.isResizable) this._resizableEvent()

    //popup-window style
    if (this.options.width === window.innerWidth && this.options.height === window.innerHeight)
      this._boxElem.classList.add(classNames.fullscreen)

    const height = this.options.type === "audio" ? defaultValues.heightAudio : this.options.height
    const width = this.options.type === "audio" ? defaultValues.widthAudio : this.options.width
    const left = (window.innerWidth - width) / 2
    const top = (window.innerHeight - height) / 2

    this._boxElem.style.cssText = `
            width: ${width}px;
            height: ${height}px;
            left: ${left}px;
            top: ${top}px;
          `
    document.body.offsetWidth // add a delay between append html and add class for transition
    this._boxElem.classList.add(classNames.show)

    this.initEvents()
  }

  initEvents() {
    if (!this.options.hasHeader) return
    //close with button
    if (this.options.hasBtnClose) this.btnCloseEventHandler()

    if (this.options.hasBtnSave) this.btnSaveEventHandler()

    if (this.options.hasBtnFullscreen && this.options.type !== "audio")
      this.btnFullscreenEventHandler()

    if (this.options.hasBtnHelp) this.btnHelpEventHandler()
  }

  close() {
    if (!this._boxElem) return

    this._boxElem.remove()
  }

  /**
   *
   * @param {HtmlElement} elem element to add style with transition
   * @param {Function} styleCallBack callback function to run your styles
   * @param {String} transition
   * @returns
   */
  async _addStyleWithTransition(elem = this._boxElem, styleCallBack, transition = "all .3s") {
    return new Promise(resolve => {
      const onTransitionEnd = () => {
        elem.removeEventListener("transitionend", onTransitionEnd)
        return resolve()
      }
      if (!elem) throw new Error("elem not found")

      elem.addEventListener("transitionend", onTransitionEnd)
      elem.style.transition = transition
      styleCallBack()
    })
      .then(() => {
        elem.style.transition = "unset"
      })
      .catch(err => {
        console.log(err)
      })
  }

  btnCloseEventHandler() {
    this._btnCloseElem.addEventListener("click", () => this.close())
  }

  btnSaveEventHandler() {
    this._btnSaveElem.addEventListener("click", e => {
      const target = e.target
      target.classList.toggle(classNames.activeBtn)

      if (this.options.saveEvent) this.options.saveEvent()
    })
  }

  btnHelpEventHandler() {
    this._btnHelpElem.addEventListener(
      "click",
      () => this.options.helpEvent && this.options.helpEvent()
    )
  }

  btnFullscreenEventHandler() {
    this._btnFullscreenElem.addEventListener("click", e => {
      const btn = e.target
      const action = btn.dataset.action
      if (action === "open") this.openFullscreen()
      else if (action === "close") this.closeFullscreen()
    })

    this.fullscreenChangeHandler("popup_btn_fullscreen")
  }

  openFullscreen() {
    this.requestOpenFullscreen(this._boxElem)
  }

  closeFullscreen() {
    this.requestCloseFullscreen()
  }

  requestOpenFullscreen(selector) {
    if (selector.requestFullscreen) selector.requestFullscreen()
    else if (selector.mozRequestFullScreen) selector.mozRequestFullScreen() // Firefox
    else if (selector.webkitRequestFullscreen) selector.webkitRequestFullscreen() // Safari
    else if (selector.msRequestFullscreen) selector.msRequestFullscreen() // IE11
  }

  requestCloseFullscreen() {
    if (document.exitFullscreen) document.exitFullscreen()
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen() // Firefox
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen() // Safari
    else if (document.msExitFullscreen) document.msExitFullscreen() // IE11
  }

  fullscreenChangeHandler(id) {
    document.onfullscreenchange = function () {
      const selector = document.getElementById(id)

      if (selector.dataset.action === "open") selector.dataset.action = "close"
      else if (selector.dataset.action === "close") selector.dataset.action = "open"
    }
  }

  _draggableEvent() {
    this._headerElem.addEventListener("mousedown", this._dragStart)
  }

  _dragStart = e => {
    this._params.enableDragging = true
    this._params.startMousePosition.X = e.clientX
    this._params.startMousePosition.Y = e.clientY
    this._params.startBoxPosition.X = this._boxElem.offsetLeft
    this._params.startBoxPosition.Y = this._boxElem.offsetTop
    document.body.style.cursor = "move"

    document.body.addEventListener("mousemove", this._dragMove)
    document.body.addEventListener("mouseup", this._dragEnd)
    document.body.addEventListener("mouseleave", this._dragEnd)
  }

  _dragMove = e => {
    if (!this._params.enableDragging) return

    this._boxElem.style.left =
      this._params.startBoxPosition.X + e.clientX - this._params.startMousePosition.X + "px"

    this._boxElem.style.top =
      this._params.startBoxPosition.Y + e.clientY - this._params.startMousePosition.Y + "px"
  }

  _dragEnd = () => {
    if (!this._params.enableDragging) return
    this._params.enableDragging = false

    this._params.startMousePosition.X = 0
    this._params.startMousePosition.Y = 0

    this._rePositionBoxInOutOfWindow()

    document.body.style.cursor = ""

    document.body.removeEventListener("mousemove", this._dragMove)
    document.body.removeEventListener("mouseup", this._dragEnd)
    document.body.removeEventListener("mouseleave", this._dragEnd)
  }

  async _rePositionBoxInOutOfWindow() {
    const box = this._boxElem

    let reposition = false

    let callbackX = () => {}
    let callbackY = () => {}
    //X
    if (box.offsetLeft < 0) {
      reposition = true
      callbackX = () => (box.style.left = 0 + "px")
    } else if (box.offsetLeft + box.offsetWidth > window.innerWidth) {
      reposition = true
      callbackX = () => (box.style.left = window.innerWidth - box.offsetWidth + "px")
    }

    //Y
    if (box.offsetTop < 0) {
      reposition = true
      callbackY = () => (box.style.top = 0 + "px")
    } else if (box.offsetTop + box.offsetHeight > window.innerHeight) {
      reposition = true
      callbackY = () => (box.style.top = window.innerHeight - box.offsetHeight + "px")
    }

    if (!reposition) return
    await this._addStyleWithTransition(box, () => {
      callbackX()
      callbackY()
    })
  }

  _resizableEvent() {}

  get _selectPopupTypeHTML() {
    return {
      iframe: `<iframe ${
        this.options.srcdoc ? `srcdoc='${this.options.srcdoc}'` : `src="${this.options.url}"`
      } class="box-item"></iframe>`,
      video: `<video src="${this.options.url}" class="box-item" ${
        this.options.hasVideoControls && "controls"
      } ${this.options.isVideoAutoPlay && "autoplay"}>
        <source src="${this.options.url}" type="video/mp4"/>
      </video>`,
      audio: `<audio src="${this.options.url}" class="box-item" ${
        this.options.hasAudioControls && "controls"
      } ${this.options.isAudioAutoPlay && "autoplay"}>
        <source src="${this.options.url}" type="audio/mpeg"/>
      </audio>`,
      image: `<img src="${this.options.url}" class="box-item" />`,
    }
  }

  get _generateLoadingHTML() {
    return `<div id="popup_fix_loading" class="popup-media-fix-loading">&nbsp;</div>`
  }

  get _generateMainBoxHTML() {
    return `<div id="popup_iframe_box" class="popup-media-window" data-type="${this.options.type}">
              <div id="popup_body" class="body">
                ${this._selectPopupTypeHTML[this.options.type]}
              </div>           
            </div>`
  }

  get _generateBoxHeaderHTML() {
    return `<div id="popup_header" class="popup-media-window-header" dir="${this.options.dir}">
              <p class="header-title">${this.options.title}</p>
            </div>`
  }

  get _generateBtnCloseHTML() {
    return `<button id="popup_btn_close" type="button" class="btn-white btn-close-modal">
              <span>${this.options.iconClose}</span>
            </button>`
  }

  get _generateFullscreenButtonHTML() {
    return `<button id="popup_btn_fullscreen" type="button" class="btn-outline-white btn-fullscreen" data-action="open">
              <span>${this.options.iconFullscreen}</span>
            </button>`
  }

  get _generateHelpButtonHTML() {
    return `<button id="popup_btn_help" type="button" class="btn-outline-white btn-guidance">
              <span>${this.options.iconHelp}</span>
            </button>`
  }

  get _generateSaveButtonHTML() {
    return `<button id="popup_btn_save" type="button" class="btn-outline-white btn-save">
              <span>${this.options.iconSave}</span>
            </button>`
  }

  get _boxElem() {
    return document.querySelector("#popup_iframe_box")
  }

  get _headerElem() {
    return document.querySelector("#popup_header")
  }

  get _bodyElem() {
    return document.querySelector("#popup_body")
  }

  get _btnCloseElem() {
    return document.querySelector("#popup_btn_close")
  }

  get _btnSaveElem() {
    return document.querySelector("#popup_btn_save")
  }

  get _btnHelpElem() {
    return document.querySelector("#popup_btn_help")
  }

  get _btnFullscreenElem() {
    return document.querySelector("#popup_btn_fullscreen")
  }

  get _loadingElem() {
    return this._bodyElem.querySelector("#popup_fix_loading")
  }
}
