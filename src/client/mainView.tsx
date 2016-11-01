import * as React from 'react';
import * as Splitter from 'react-split-pane';
import * as BotChat from 'msbotchat';
import * as log from './log';
import { getSettings, settingsDefault, Settings, addSettingsListener } from './settings';
import { LayoutActions, InspectorActions, LogActions } from './reducers';
import { Settings as ServerSettings } from '../types/serverSettingsTypes';
import { AddressBar } from './addressBar/addressBar';
import { InspectorView } from './inspectorView'
import { LogView } from './logView';
import { uniqueId } from '../utils';
import { IUser } from '../types/userTypes';


export class MainView extends React.Component<{}, {}> {
    settingsUnsubscribe: any;
    reuseKey: number = 0;
    directline: BotChat.DirectLine3;
    conversationId: string;
    userId: string;
    botId: string;

    componentWillMount() {
        this.settingsUnsubscribe = addSettingsListener((settings: Settings) => {
            let conversationChanged = false;
            if (this.conversationId !== settings.conversation.conversationId) {
                this.conversationId = settings.conversation.conversationId;
                conversationChanged = true;
            }

            let userChanged = false;
            if (this.userId !== settings.serverSettings.users.currentUserId) {
                this.userId = settings.serverSettings.users.currentUserId;
                userChanged = true;
            }

            let botChanged = false;
            if (this.botId !== settings.serverSettings.activeBot) {
                this.botId = settings.serverSettings.activeBot;
                botChanged = true;
            }

            if (conversationChanged || userChanged || botChanged) {
                if (this.directline) {
                    this.directline.end();
                    this.directline = undefined;
                }
                if (this.conversationId.length && this.userId.length && this.botId.length) {
                    this.directline = new BotChat.DirectLine3(
                        { secret: settings.conversation.conversationId, token: settings.conversation.conversationId },
                        `http://localhost:${settings.serverSettings.directLine.port}`,
                        'v3/directline'
                    );
                    this.directline.start();
                    log.info(`started new conversation with ${new ServerSettings(settings.serverSettings).botById(settings.serverSettings.activeBot).botUrl}`);
                }
                this.reuseKey++;
                this.forceUpdate();
            }
        });
    }

    componentWillUnmount() {
        if (this.settingsUnsubscribe) {
            this.settingsUnsubscribe();
            this.settingsUnsubscribe = undefined;
        }
        if (this.directline) {
            this.directline.end();
            this.directline = undefined;
        }
        this.conversationId = undefined;
        this.userId = undefined;
        this.botId = undefined;
    }

    getCurrentUser(serverSettings: ServerSettings): IUser {
        if (serverSettings && serverSettings.users && serverSettings.users.currentUserId) {
            let user: IUser = serverSettings.users.usersById[serverSettings.users.currentUserId];
            if (user && user.id && user.id.length)
                return user;
        }
        return null;
    }

    onActivitySelected(activity: any) {
        InspectorActions.setSelectedObject(activity);
    }

    botChatComponent() {
        if (this.directline) {
            const settings = getSettings();
            const props: BotChat.ChatProps = {
                botConnection: this.directline,
                locale: 'en-us',
                formatOptions: {
                    showHeader: false
                },
                onActivitySelected: this.onActivitySelected,
                user: this.getCurrentUser(settings.serverSettings)
            }
            InspectorActions.clear();
            let srvSettings = new ServerSettings(settings.serverSettings);
            return <BotChat.Chat key={this.reuseKey} {...props} />
        }
        return null;
    }

    render() {
        const settings = getSettings();
        return (
            <div className='mainview'>
                <div className='botchat-container'>
                    <Splitter split="vertical" minSize="200px" defaultSize={`${settings.layout.vertSplit}px`} primary="second" onChange={(size) => LayoutActions.rememberVerticalSplitter(size)}>
                        <div className={"wc-chatview-panel"}>
                            <AddressBar />
                            {this.botChatComponent()}
                        </div>
                        <div className="wc-app-inspectorview-container">
                            <Splitter split="horizontal" primary="second" minSize="42px" defaultSize={`${settings.layout.horizSplit}px`} onChange={(size) => LayoutActions.rememberHorizontalSplitter(size)}>
                                <div className="wc-chatview-panel">
                                    <div className="wc-inspectorview-header">
                                        <span>INSPECTOR</span>
                                    </div>
                                    <InspectorView />
                                </div>
                                <div className="wc-app-logview-container">
                                    <div className="wc-logview-header">
                                        <span>LOG</span>
                                    </div>
                                    <LogView />
                                </div>
                            </Splitter>
                        </div>
                    </Splitter>
                </div>
            </div>
        );
    }
}