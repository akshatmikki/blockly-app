import * as React from "react";
import { useEffect, useRef, useState } from "react";
import * as Blockly from "blockly/core";
import "blockly/blocks";
import { X, Check } from "lucide-react";
import { FunctionManager } from "../plugins/functions/functionManager";
import { 
    ARGUMENT_REPORTER_BOOLEAN_BLOCK_TYPE,
    ARGUMENT_REPORTER_NUMBER_BLOCK_TYPE,
    ARGUMENT_REPORTER_STRING_BLOCK_TYPE,
    ARGUMENT_REPORTER_ARRAY_BLOCK_TYPE,
    ARGUMENT_REPORTER_CUSTOM_BLOCK_TYPE,
    FUNCTION_DECLARATION_BLOCK_TYPE
} from "../plugins/functions/constants";

export interface FunctionEditorProps {
    isOpen: boolean;
    onClose: () => void;
    mutation?: Element;
    onDone: (mutation: Element) => void;
}

export function FunctionEditor({ isOpen, onClose, mutation, onDone }: FunctionEditorProps) {
    const workspaceHostRef = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
    const [functionBlock, setFunctionBlock] = useState<Blockly.BlockSvg | null>(null);

    useEffect(() => {
        if (!isOpen || !workspaceHostRef.current) return undefined;

        // Initialize a headless workspace for the modal
        const workspace = Blockly.inject(workspaceHostRef.current, {
            readOnly: false,
            media: "/blockly/media/",
            trashcan: false,
            scrollbars: true,
            move: {
                scrollbars: {
                    horizontal: true,
                    vertical: true
                },
                drag: true,
                wheel: true
            },
        });
        workspaceRef.current = workspace;

        let block: Blockly.BlockSvg;

        if (mutation) {
            // Edit existing function: parse mutation and reconstruct the block
            const name = mutation.getAttribute("name");
            block = workspace.newBlock(FUNCTION_DECLARATION_BLOCK_TYPE) as Blockly.BlockSvg;
            if (name) block.setFieldValue(name, "function_name");
            
            if (block.domToMutation) {
                block.domToMutation(mutation);
            }
        } else {
            // New function
            block = workspace.newBlock(FUNCTION_DECLARATION_BLOCK_TYPE) as Blockly.BlockSvg;
            block.setFieldValue("doSomething", "function_name");
        }

        block.initSvg();
        block.render();
        block.setDeletable(false); // Cannot delete the main fn block
        block.setMovable(false); // keep it centered
        
        // Center the block in the workspace
        workspace.centerOnBlock(block.id, false);
        
        setFunctionBlock(block);

        return () => {
            workspace.dispose();
            workspaceRef.current = null;
        };
    }, [isOpen, mutation]);

    const handleAddArgument = (type: string, argTypeBlockName: string, defaultName: string) => {
        if (!workspaceRef.current || !functionBlock) return;
        
        const fnBlockAny = functionBlock as any;
        if (fnBlockAny.addParam_) {
            fnBlockAny.addParam_(type, defaultName);
        }
    };

    const handleDone = () => {
        if (!functionBlock) return;
        
        const fnBlockAny = functionBlock as any;
        if (fnBlockAny.updateFunctionSignature) {
            fnBlockAny.updateFunctionSignature();
        }
        
        let mut: Element | null = null;
        if (fnBlockAny.mutationToDom) {
            mut = fnBlockAny.mutationToDom();
        } else {
            mut = document.createElement('mutation');
            const nameField = functionBlock.getField("function_name");
            mut.setAttribute('name', nameField ? nameField.getValue() : 'doSomething');
        }
        
        if (mut) {
             onDone(mut);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50">
            <div className="flex flex-col w-[800px] max-w-[90vw] h-[500px] max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">Edit Function</h2>
                    <button onClick={onClose} className="p-2 text-gray-500 rounded-full hover:bg-gray-100 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 border-b border-gray-200 overflow-x-auto">
                    <span className="text-sm font-medium text-gray-600 mr-2 whitespace-nowrap">Add a parameter</span>
                    
                    <button 
                        onClick={() => handleAddArgument("string", ARGUMENT_REPORTER_STRING_BLOCK_TYPE, "text")}
                        className="flex items-center gap-1 font-medium px-3 py-1.5 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 rounded whitespace-nowrap"
                    >
                        <span>T</span> Text
                    </button>
                    <button 
                         onClick={() => handleAddArgument("boolean", ARGUMENT_REPORTER_BOOLEAN_BLOCK_TYPE, "bool")}
                        className="flex items-center gap-1 font-medium px-3 py-1.5 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 rounded whitespace-nowrap"
                    >
                        <span>⤨</span> Boolean
                    </button>
                    <button 
                         onClick={() => handleAddArgument("number", ARGUMENT_REPORTER_NUMBER_BLOCK_TYPE, "num")}
                        className="flex items-center gap-1 font-medium px-3 py-1.5 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 rounded whitespace-nowrap"
                    >
                        <span>#</span> Number
                    </button>
                    <button 
                         onClick={() => handleAddArgument("Array", ARGUMENT_REPORTER_ARRAY_BLOCK_TYPE, "list")}
                        className="flex items-center gap-1 font-medium px-3 py-1.5 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 rounded whitespace-nowrap"
                    >
                        <span>☰</span> Array
                    </button>
                    <button 
                         onClick={() => handleAddArgument("LedSprite", ARGUMENT_REPORTER_CUSTOM_BLOCK_TYPE, "sprite")}
                        className="flex items-center gap-1 font-medium px-3 py-1.5 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 rounded whitespace-nowrap"
                    >
                        <span>➚</span> LedSprite
                    </button>
                    <button 
                         onClick={() => handleAddArgument("Image", ARGUMENT_REPORTER_CUSTOM_BLOCK_TYPE, "image")}
                        className="flex items-center gap-1 font-medium px-3 py-1.5 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 rounded whitespace-nowrap"
                    >
                        <span>🖼</span> Image
                    </button>
                </div>

                {/* Main Workspace Area */}
                <div className="flex-1 relative bg-slate-100">
                    <div ref={workspaceHostRef} className="absolute inset-0" />
                </div>

                {/* Footer */}
                <div className="flex px-6 py-4 border-t border-gray-200 justify-end bg-white">
                    <button 
                        onClick={handleDone}
                        className="flex items-center gap-2 px-6 py-2 bg-green-700 hover:bg-green-800 text-white font-medium rounded-md transition-colors"
                    >
                        <span>Done</span>
                        <Check size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}

