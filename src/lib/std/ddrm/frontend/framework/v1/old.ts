export function html(location: string) {
  let elem: HTMLElement | null = document.querySelector(location);

  const returns: IReturns = { set, on, get, add, attr, env };
  if (elem == null) elem = document.body;

  function attr(name: string) {
    function set(value: string) {
      return elem?.setAttribute(name, value);
    }
    function has() {
      return elem?.hasAttribute(name)
    }
    function get() {
      return elem?.getAttribute(name);
    }
    function remove() {
      return elem?.removeAttribute(name);
    }
    return { set, remove, get, has };
  }
  function set(code: string) {
    return {
      el:(elem.innerHTML = code),
      _: returns
    };
  }
  function add(code: string) {
    return {
      el:(elem.innerHTML = code),
      _: returns
    };
  }
  function get() {
    return elem;
  }
  function on<K extends keyof HTMLElementEventMap>(
    event: K,
    cb: Function
  ): any {
    return elem?.addEventListener(event, (...ev:any[]) => cb({ ...returns},...ev));
  }
  function env(cb: Function): any {
    return cb(returns);
  }
  return returns;
}

type Function = (...returns: any[]) => any

export interface IReturns {
  set: (code: string) => {
    el: string,
    _: IReturns
  };
  add: (code: string) =>  {
    el: string,
    _: IReturns
  };
  on: <K extends keyof HTMLElementEventMap>(event: K, cb: Function) => any;
  get: () => HTMLElement | null;
  attr: (name: string) => {
    set: (value: string) => void;
    get: () => string;
    remove: () => void;
  };
  env: (cb: Function) => any;
}
