import React from 'react';
import { observer } from 'mobx-react-lite';
import Flyout from '@/components/flyout';
import { useStore } from '@/hooks/useStore';
import StopBotModal from '../dashboard/stop-bot-modal';
import Toolbar from './toolbar';
import Toolbox from './toolbox';
import './workspace.scss';
import { takeSmartPipsBot } from '../main/smartpips-bot-templates';

const WorkspaceWrapper = observer(() => {
    const { blockly_store } = useStore();
    const { onMount, onUnmount, is_loading } = blockly_store;

    React.useEffect(() => {
        onMount();
        return () => {
            onUnmount();
        };
    }, []);

    React.useEffect(() => {
        const queued = takeSmartPipsBot();
        const workspace = window.Blockly?.derivWorkspace;
        if (!queued || !workspace || is_loading) return;
        try {
            const xmlDom = window.Blockly.utils.xml.textToDom(queued.xml);
            window.Blockly.Xml.clearWorkspaceAndLoadFromXml(xmlDom, workspace);
            workspace.cleanUp();
            workspace.clearUndo();
            workspace.strategy_to_load = queued.xml;
            workspace.current_strategy_id = window.Blockly.utils.idGenerator.genUid();
            workspace.options?.renderer?.refresh?.();
        } catch (error) {
            console.error('Unable to load SmartPips bot template:', error);
        }
    }, [is_loading]);

    if (is_loading) return null;

    if (window.Blockly?.derivWorkspace)
        return (
            <React.Fragment>
                <Toolbox />
                <Toolbar />
                <Flyout />
                <StopBotModal />
            </React.Fragment>
        );

    return null;
});

export default WorkspaceWrapper;
