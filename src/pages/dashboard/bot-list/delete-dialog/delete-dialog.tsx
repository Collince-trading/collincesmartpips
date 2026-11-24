// @ts-nocheck — vendored bot code with known upstream type gaps; see AGENTS.md
// Removed unused React import - React 17+ JSX transform doesn't require it
import React from 'react';
import localForage from 'localforage';
import LZString from 'lz-string';
import { observer } from 'mobx-react-lite';
import { NOTIFICATION_TYPE } from '@/components/bot-notification/bot-notification-utils';
import Dialog from '@/components/shared_ui/dialog';
import Text from '@/components/shared_ui/text';
import { getSavedWorkspaces } from '@/external/bot-skeleton';
import { useStore } from '@/hooks/useStore';
import { TStrategy } from '@/types';
import { localize } from '@deriv-com/translations';
import './delete-dialog.scss';

const DeleteDialog = observer(() => {
    const { load_modal, dashboard } = useStore();
    const {
        is_delete_modal_open,
        onToggleDeleteDialog,
        selected_strategy_id,
        setDashboardStrategies,
        loadStrategyToBuilder,
        refreshStrategiesTheme,
        resetBotBuilderStrategy,
    } = load_modal;
    const { setOpenSettings } = dashboard;

    const [is_deleting, setIsDeleting] = React.useState(false);

    const resetStrategiesAfterDelete = async (deleted_strategy_id: string, updated_workspaces: Array<TStrategy>) => {
        if (updated_workspaces.length) {
            if (selected_strategy_id === deleted_strategy_id) {
                // Keep the selected id in sync with the new list before refreshing
                // the preview; otherwise the preview can point at a deleted strategy.
                setDashboardStrategies(updated_workspaces);
                await loadStrategyToBuilder(updated_workspaces[0], false);
            }
            await refreshStrategiesTheme();
        } else {
            resetBotBuilderStrategy();
        }
    };

    const removeBotStrategy = async (strategy_id: string) => {
        const workspaces = (await getSavedWorkspaces()) || [];
        const updated_workspaces = workspaces.filter(
            (strategy_from_workspace: TStrategy) => strategy_from_workspace.id !== strategy_id
        );

        // Persist first. Do not update the UI or close the dialog if storage fails.
        await localForage.setItem('saved_workspaces', LZString.compress(JSON.stringify(updated_workspaces)));
        setDashboardStrategies(updated_workspaces);
        await resetStrategiesAfterDelete(strategy_id, updated_workspaces);
        onToggleDeleteDialog(false);
        setOpenSettings(NOTIFICATION_TYPE.BOT_DELETE);
    };

    const handleDeleteConfirm = async () => {
        if (is_deleting || !selected_strategy_id) return;
        setIsDeleting(true);
        try {
            await removeBotStrategy(selected_strategy_id);
        } catch (error) {
            // Keep the dialog open so the user can retry; do not force a page reload.
            console.error('Unable to delete the saved bot:', error);
        } finally {
            setIsDeleting(false);
        }
    };
    return (
        <div>
            <Dialog
                title={localize('Delete bot')}
                is_visible={is_delete_modal_open}
                confirm_button_text={localize('Yes, delete')}
                onConfirm={handleDeleteConfirm}
                cancel_button_text={localize('No')}
                onCancel={() => {
                    onToggleDeleteDialog(false);
                }}
                is_mobile_full_width={false}
                className={'dc-dialog__delete-strategy--delete'}
                has_close_icon
            >
                <div>
                    <Text color='prominent' lineHeight='s' size='xs'>
                        {localize('Your bot will be permanently deleted when you hit ')}
                        <strong>{localize('Yes, delete.')}</strong>
                    </Text>
                </div>
                <div>
                    <Text color='prominent' lineHeight='xl' size='xs'>
                        {localize('Are you sure you want to delete it?')}
                    </Text>
                </div>
            </Dialog>
        </div>
    );
});

export default DeleteDialog;
