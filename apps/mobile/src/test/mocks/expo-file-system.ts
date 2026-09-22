/** The file system is native; tests only need something that remembers the uri it was given. */
export class File {
  constructor(readonly uri: string) {}
}
