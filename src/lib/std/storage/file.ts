import * as fs from 'node:fs';
import * as path from 'node:path';

//# .LIB_STORAGE_COOKIES
export type CheckIfReturnType = {state: boolean, meta: {cname: string, cvalue: string}}
export type CheckIfCbReturnType = (state: boolean, meta: {cname: string, cvalue: string}) => void

export class Files {
  public cookiePrefix = ""
  public clusterPrefix = ""

  public store: {[k: string]: any} = {}

  /**
   * 
   * @param {String} clusterPrefix
   */
  constructor(public filePath = "./db.json", clusterPrefix?: string) {
    if (clusterPrefix !== undefined) this.clusterPrefix = clusterPrefix

  }

  public Load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        this.store = JSON.parse(data);
      }
    } catch (e) {
      console.error('Error loading file store:', e);
    }
  }

  public Save() {
    try {
      const data = JSON.stringify(this.store, null, 2);
      fs.writeFileSync(this.filePath, data, 'utf-8');
    } catch (e) {
      console.error('Error saving file store:', e);
    }
  }

  public State() {}

  public Delete(cname:string) {
    delete this.store[cname];
  }

  /**
   *
   * @param {string} cname
   * @param {string} cvalue
   * @param {number} exdays
   */
  public Set(cname:string, cvalue:any, exdays?:number) {
    this.store[cname] = cvalue;
  }
  /**
   *
   * @param {string} cname
   * @returns {string}
   */
  public Get(cname:string): any {
    return this.store[cname] ?? "";
  }
  /**
   *
   * @param {string} cname
   * @returns {boolean}
   */
  public Check(cname: string): boolean {
    return cname in this.store;
  }

  /**
   *
   * @param {string} cname
   * @param {string} cvalue
   * @returns {{state:boolean, meta: {cname:string,cvalue:string}}}
   */
  public CheckIf(cname: string, cvalue: string): CheckIfReturnType {
    const state = (this.store[cname] === cvalue);
    return {
      state,
      meta: {cname, cvalue}
    }
  }

  /**
   *
   * @param {string} cname
   * @param {string} cvalue
   * @param {(state:boolean, meta: {cname:string,cvalue:string}) => void} callback
   */
  public CheckIfCB(cname: string, cvalue: string, callback: CheckIfCbReturnType) {
    const state = (this.store[cname] === cvalue);
    callback(state, {cname, cvalue});
  }
}