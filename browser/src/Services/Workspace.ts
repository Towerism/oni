/**
 * Workspace.ts
 *
 * The 'workspace' is responsible for managing the state of the current project:
 *  - The current / active directory (and 'Open Folder')
 */

import * as types from "vscode-languageserver-types"

import { Observable } from "rxjs/Observable"

import "rxjs/add/observable/defer"
import "rxjs/add/observable/from"
import "rxjs/add/operator/concatMap"

import { editorManager } from "./EditorManager"

import * as Helpers from "./../Plugins/Api/LanguageClient/LanguageClientHelpers"

import { Event, IEvent } from "./../Event"
import * as Log from "./../Log"

export class Workspace implements Oni.Workspace {
    private _onDirectoryChangedEvent = new Event<string>()

    public get onDirectoryChanged(): IEvent<string> {
        return this._onDirectoryChangedEvent
    }

    public changeDirectory(newDirectory: string) {
        process.chdir(newDirectory)
        this._onDirectoryChangedEvent.dispatch(newDirectory)
    }

    public async applyEdits(edits: types.WorkspaceEdit): Promise<void> {

        if (edits.documentChanges) {
            console.warn("documentChanges not implemented yet")
            return
        }

        const files = Object.keys(edits)

        // Show modal to grab input
        // await editorManager.activeEditor.openFiles(files)

        const deferredEdits = await files.map((fileUri: string) => {
            return Observable.defer(async () => {
                const changes = edits[fileUri]
                const fileName = Helpers.unwrapFileUriPath(fileUri)
                // TODO: Sort changes?
                Log.verbose("[Workspace] Opening file: " + fileName)
                const buf = await editorManager.activeEditor.openFile(fileName)
                Log.verbose("[Workspace] Got buffer for file: " + buf.filePath + " and id: " + buf.id)
                await buf.applyTextEdits(changes)
                Log.verbose("[Workspace] Applied " + changes.length + " edits to buffer")
            })
        })

        Observable.from(deferredEdits)
                .concatMap(de => de)
                .subscribe(() => { }, () => { }, () => {
                    console.log("[Workspace] Edit application completed.")
                })

        // Hide modal
    }
}

export const workspace = new Workspace()