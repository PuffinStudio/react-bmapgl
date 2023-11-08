/**
 * @file 异步加载JSAPI的高阶组件
 * @author hedongran [hdr01@126.com]
 */

import React, { Component } from "react";
import getDisplayName from "../utils/getDisplayName";

interface WrapperHocProps {
  /** 开放平台申请的ak */
  ak: string;
  /** dugis booter的启动地址，非必填 */
  booter?: string;
}

interface MapApiLoaderProps {
  [key: string]: any;
}

interface MapApiLoaderState {
  loaded: boolean;
}

// is server side

const isServer = typeof window === "undefined";

/**
 * 异步加载JSAPI的高阶组件，在业务组件中使用，从而实现将JSAPI以异步形式插入，而不是提前放到`index.html`模板里。
 * @visibleName MapApiLoaderHOC 异步加载HOC
 */
export default (hocProps: WrapperHocProps) => (WrappedComponent: any) => {
  if(isServer){
    return null
  }
  return class MapApiLoaderHOC extends Component<
    MapApiLoaderProps,
    MapApiLoaderState
  > {
    static displayName = `MapApiLoaderHOC(${getDisplayName(WrappedComponent)})`;
    private apiTimer: number;
    private loadedTimer: number;

    constructor(props: MapApiLoaderProps) {
      super(props);
      this.state = {
        loaded: this.isLoadReady(),
      };
      this.loadJSAPI = this.loadJSAPI.bind(this);
      this.handleLoaded = this.handleLoaded.bind(this);
    }

    private isLoadReady(): boolean {
      return !!(window.BMapGL && window.BMapGL.Map);
    }

    componentDidMount() {
      if (!this.isLoadReady()) {
        if (!hocProps.ak) {
          throw new TypeError("MapApiLoaderHOC: ak is required");
        }
        this.loadJSAPI();
      }
    }

    componentWillUnmount() {
      if (this.apiTimer) {
        clearTimeout(this.apiTimer);
      }
      if (this.loadedTimer) {
        clearTimeout(this.loadedTimer);
      }
    }

    loadJSAPI() {
      if (this.isLoadReady()) {
        this.handleLoaded();
        return;
      }
      if (window["loadingMap"]) {
        this.apiTimer = window.setTimeout(() => {
          this.loadJSAPI();
        }, 300);
      } else if (!window["MapApiLoaderCallback"]) {
        window["loadingMap"] = true;
        window["MapApiLoaderCallback"] = () => {
          delete window["loadingMap"];
          delete window["MapApiLoaderCallback"];
        };
        const ak = hocProps.ak;
        const booter = hocProps.booter;
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = `//api.map.baidu.com/api?type=webgl&v=1.0&ak=${ak}&callback=MapApiLoaderCallback`;
        if (booter) {
          window["BMAP_AUTHENTIC_KEY"] = ak;
          script.src = booter;
        }
        document.body.appendChild(script);
        this.loadedTimer = window.setTimeout(() => {
          this.handleLoaded();
        }, 300);
      }
    }

    handleLoaded() {
      if (!this.isLoadReady()) {
        this.loadedTimer = window.setTimeout(() => {
          this.handleLoaded();
        }, 300);
        return;
      }
      this.setState({
        loaded: true,
      });
    }

    render() {
      const { loaded } = this.state;
      return loaded ? (
        <WrappedComponent {...this.props} />
      ) : (
        <div>loading...</div>
      );
    }
  };
};
