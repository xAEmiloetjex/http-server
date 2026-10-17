export function framework<E extends HTMLElement>(query: string)
{
    const _elem = document.querySelector(query);
    const elem = _elem !== null ? _elem : document.body;
    const returns: IReturns<E> = { set, on, get, add, attr, env };
    
    function set(code: string) {
      return {
        el:(elem.innerHTML = code),
        _: returns
      };
    }
    function add(code: string) {
      return {
        el:(elem.innerHTML += code),
        _: returns
      };
    }

    function attr(key: string)
    {
        function get()
        {
            return elem.getAttribute(key);
        }
        function set(value: string)
        {
            return elem.setAttribute(key, value);
        }
        function has()
        {
            return elem.hasAttribute(key);
        }
        function remove()
        {
            return elem.removeAttribute(key);
        }
        return {get,set,has,remove}
    }

  function get() {
    return elem;
  }
  function on<K extends keyof HTMLElementEventMap>(
    event: K,
    cb: (r: IReturns<E>) => any
  ): any {
    return elem?.addEventListener(event, (...ev:any[]) => cb({ ...returns},...ev));
  }
  function env(cb: Func): any {
    return cb(returns);
  }
  return returns;
}

export const v1 = framework;
export const html = framework;

type Func = (...returns: any[]) => any

export interface IReturns<E extends HTMLElement> {
  set: (code: string) => {
    el: string,
    _: IReturns<E>
  };
  add: (code: string) =>  {
    el: string,
    _: IReturns<E>
  };
  on: <K extends keyof HTMLElementEventMap>(event: K, cb: IReturns<E>) => any;
  get: () => E;
  attr: (name: string) => {
    set: (value: string) => void;
    get: () => string;
    has: () => boolean;
    remove: () => void;
  };
  env: (cb: (_: IReturns<E>) => void) => any;
}
