import React, {
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

import {
    Box,
    Button,
    Divider,
    Dropdown,
    FormControl,
    FormHelperText,
    FormLabel,
    IconButton,
    Input,
    Link,
    Menu,
    MenuButton,
    MenuItem,
    Option,
    Select,
    Stack,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from "@mui/joy";

import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import SdStorageIcon from "@mui/icons-material/SdStorage";

import {NotificationContext} from "../../../../../contexts/NotificationContextProvider";
import {StateContext} from "../../../../../contexts/StateContextProvider";
import {Nullable} from "../../../../../typings/common";
import {
    CONFIG_KEY,
    LOCAL_STORAGE_KEY,
    ProfileName,
} from "../../../../../typings/config";
import {LOG_LEVEL} from "../../../../../typings/logs";
import {DO_NOT_TIMEOUT_VALUE} from "../../../../../typings/notifications";
import {
    TAB_DISPLAY_NAMES,
    TAB_NAME,
} from "../../../../../typings/tab";
import {ACTION_NAME} from "../../../../../utils/actions";
import {
    createProfile,
    DEFAULT_PROFILE_NAME,
    deleteLocalStorageProfile,
    forceProfile,
    getConfig,
    listProfiles,
    ProfileMetadata,
    updateConfig,
} from "../../../../../utils/config";
import {defer} from "../../../../../utils/time";
import CustomTabPanel from "../CustomTabPanel";
import ThemeSwitchFormField from "./ThemeSwitchFormField";

import "./index.css";


/**
 * Gets form fields information for user input of configuration values.
 *
 * @param profileName
 * @return A list of form fields information.
 */
const getConfigFormFields = (profileName: ProfileName) => [
    {
        helperText: (
            <span>
                [JSON] Format string for formatting a JSON log event as plain text. See the
                {" "}
                <Link
                    href={"https://docs.yscope.com/yscope-log-viewer/main/user-guide/format-struct-logs-overview.html"}
                    level={"body-sm"}
                    rel={"noopener"}
                    target={"_blank"}
                >
                    format string syntax docs
                </Link>
                {" "}
                or leave this blank to display the entire log event.
            </span>
        ),
        initialValue: getConfig(CONFIG_KEY.DECODER_OPTIONS_FORMAT_STRING, profileName),
        key: CONFIG_KEY.DECODER_OPTIONS_FORMAT_STRING,
        label: "Decoder: Format string",
        type: "text",
    },
    {
        helperText: "[JSON] Key to extract the log level from.",
        initialValue: getConfig(CONFIG_KEY.DECODER_OPTIONS_LOG_LEVEL_KEY, profileName),
        key: CONFIG_KEY.DECODER_OPTIONS_LOG_LEVEL_KEY,
        label: "Decoder: Log level key",
        type: "text",
    },
    {
        helperText: "[JSON] Key to extract the log timestamp from.",
        initialValue: getConfig(CONFIG_KEY.DECODER_OPTIONS_TIMESTAMP_KEY),
        key: CONFIG_KEY.DECODER_OPTIONS_TIMESTAMP_KEY,
        label: "Decoder: Timestamp key",
        type: "text",
    },
    {
        helperText: "Number of log messages to display per page.",
        initialValue: getConfig(CONFIG_KEY.PAGE_SIZE),
        key: LOCAL_STORAGE_KEY.PAGE_SIZE,
        label: "View: Page size",
        type: "number",
    },
    {
        helperText: "The endpoint for accessing the LLM model.",
        initialValue: getConfig(CONFIG_KEY.LLM_OPTIONS).endpoint,
        key: LOCAL_STORAGE_KEY.LLM_OPTIONS_ENDPOINT,
        label: "LLM: Endpoint",
        type: "string",
    },
    {
        helperText: (
            <span>
                The token for Bearer authorization.
                {" "}
                Leave it blank if the endpoint does not require authorization.
            </span>),
        initialValue: getConfig(CONFIG_KEY.LLM_OPTIONS).authorization,
        key: LOCAL_STORAGE_KEY.LLM_OPTIONS_AUTHORIZATION,
        label: "LLM: Authorization",
        type: "string",
    },
    {
        helperText: "The number of events to send to the LLM.",
        initialValue: getConfig(CONFIG_KEY.LLM_OPTIONS).eventNum,
        key: LOCAL_STORAGE_KEY.LLM_OPTIONS_EVENT_NUM,
        label: "LLM: Number of events",
        type: "number",
    },
    {
        helperText: "The prompt to be used with the LLM models.",
        initialValue: getConfig(CONFIG_KEY.LLM_OPTIONS).prompt,
        key: LOCAL_STORAGE_KEY.LLM_OPTIONS_PROMPT,
        label: "LLM: Prompt",
        type: "string",
    },
];

/**
 * Handles the reset event for the configuration form.
 *
 * @param ev
 */
const handleConfigFormReset = (ev: React.FormEvent) => {
    ev.preventDefault();
    window.localStorage.clear();
    window.location.reload();
};

/**
 * Displays a setting tab panel for configurations.
 *
 * @return
 */
const SettingsTabPanel = () => {
    const {postPopUp} = useContext(NotificationContext);
    const {activatedProfileName, loadPageByAction, notifyChangedSettings} = useContext(StateContext);
    const [newProfileName, setNewProfileName] = useState<string>("");
    const [selectedProfileName, setSelectedProfileName] = useState<Nullable<ProfileName>>(activatedProfileName);
    const [profilesMetadata, setProfilesMetadata] =
        useState<ReadonlyMap<ProfileName, ProfileMetadata>>(listProfiles());
    const [canApply, setCanApply] = useState<boolean>(false);

    const handleConfigFormSubmit = useCallback((ev: React.FormEvent) => {
        ev.preventDefault();
        const formData = new FormData(ev.target as HTMLFormElement);
        const getFormDataValue = (key: string) => formData.get(key) as string;

        const formatString = getFormDataValue(CONFIG_KEY.DECODER_OPTIONS_FORMAT_STRING);
        const logLevelKey = getFormDataValue(CONFIG_KEY.DECODER_OPTIONS_LOG_LEVEL_KEY);
        const timestampKey = getFormDataValue(CONFIG_KEY.DECODER_OPTIONS_TIMESTAMP_KEY);
        const pageSize = Number(getFormDataValue(CONFIG_KEY.PAGE_SIZE));
        const authorization = getFormDataValue(LOCAL_STORAGE_KEY.LLM_OPTIONS_AUTHORIZATION);
        const endpoint = getFormDataValue(LOCAL_STORAGE_KEY.LLM_OPTIONS_ENDPOINT);
        const eventNum = getFormDataValue(LOCAL_STORAGE_KEY.LLM_OPTIONS_EVENT_NUM);
        const prompt = getFormDataValue(LOCAL_STORAGE_KEY.LLM_OPTIONS_PROMPT);

        const errorList = updateConfig(
            {
                [CONFIG_KEY.DECODER_OPTIONS_FORMAT_STRING]: formatString,
                [CONFIG_KEY.DECODER_OPTIONS_LOG_LEVEL_KEY]: logLevelKey,
                [CONFIG_KEY.DECODER_OPTIONS_TIMESTAMP_KEY]: timestampKey,
                [CONFIG_KEY.PAGE_SIZE]: pageSize,
                [CONFIG_KEY.LLM_OPTIONS]: {authorization: authorization,
                    endpoint: endpoint,
                    eventNum: Number(eventNum),
                    prompt: prompt},
            },
            selectedProfileName,
        );

        for (const error of errorList) {
            postPopUp({
                level: LOG_LEVEL.ERROR,
                message: error,
                timeoutMillis: DO_NOT_TIMEOUT_VALUE,
                title: "Unable to apply config.",
            });
        }

        setProfilesMetadata(listProfiles());
        setCanApply(false);
        setSelectedProfileName(null);
        loadPageByAction({code: ACTION_NAME.RELOAD, args: null});
    }, [
        notifyChangedSettings,
        loadPageByAction,
        postPopUp,
        selectedProfileName,
    ]);

    useEffect(() => {
        if (null === activatedProfileName) {
            return;
        }

        // The activated profile changes when the profile system is initialized / re-initialized.
        setProfilesMetadata(listProfiles());

        // Which means the profiles' metadata may have changed.
        setSelectedProfileName(activatedProfileName);
    }, [activatedProfileName]);

    const isSelectedProfileLocalStorage =
        (null !== selectedProfileName &&
        profilesMetadata.get(selectedProfileName)?.isLocalStorage) ?? false;
    const isSelectedProfileForced =
        (null !== selectedProfileName &&
            profilesMetadata.get(selectedProfileName)?.isForced) ?? false;

    return (
        <CustomTabPanel
            tabName={TAB_NAME.SETTINGS}
            title={TAB_DISPLAY_NAMES[TAB_NAME.SETTINGS]}
        >
            <form
                className={"settings-tab-container"}
                tabIndex={-1}
                onReset={handleConfigFormReset}
                onSubmit={handleConfigFormSubmit}
                onChange={() => {
                    setCanApply(true);
                }}
            >
                <Box className={"settings-form-fields-container"}>
                    <ThemeSwitchFormField/>
                    <FormControl>
                        <FormLabel>View: Page Size</FormLabel>
                        <Input
                            defaultValue={getConfig(CONFIG_KEY.PAGE_SIZE)}
                            name={CONFIG_KEY.PAGE_SIZE}
                            type={"number"}/>
                        <FormHelperText>Number of log messages to display per page.</FormHelperText>
                    </FormControl>

                    <Divider/>


                    <FormControl>
                        <FormLabel>Profile</FormLabel>
                        <Stack
                            direction={"row"}
                            gap={0.3}
                        >
                            <Select
                                size={"sm"}
                                sx={{flexGrow: 1}}
                                value={selectedProfileName}
                                endDecorator={
                                    <ToggleButtonGroup
                                        size={"sm"}
                                        spacing={0.1}
                                        variant={"soft"}
                                        value={[isSelectedProfileForced ?
                                            "forced" :
                                            ""]}
                                    >
                                        {isSelectedProfileLocalStorage && (
                                            <Dropdown>
                                                <Tooltip title={"Delete locally stored profile"}>
                                                    <MenuButton
                                                        size={"sm"}
                                                        sx={{paddingInline: "3px", zIndex: 10}}
                                                    >
                                                        <DeleteIcon/>
                                                    </MenuButton>
                                                </Tooltip>
                                                <Menu
                                                    placement={"top-start"}
                                                    size={"sm"}
                                                >
                                                    <MenuItem
                                                        onClick={() => {
                                                            if (null === selectedProfileName) {
                                                                console.error(
                                                                    "Unexpected null selectedProfileName"
                                                                );

                                                                return;
                                                            }
                                                            deleteLocalStorageProfile(
                                                                selectedProfileName,
                                                            );
                                                            window.location.reload();
                                                        }}
                                                    >
                                                        Confirm deletion
                                                    </MenuItem>
                                                </Menu>
                                            </Dropdown>
                                        )}
                                        <Tooltip title={"Force this profile on all file paths"}>
                                            <IconButton
                                                value={"forced"}
                                                variant={"soft"}
                                                onClick={() => {
                                                    const newForcedProfileName =
                                                        isSelectedProfileForced ?
                                                            null :
                                                            selectedProfileName;

                                                    forceProfile(newForcedProfileName);
                                                    setProfilesMetadata(listProfiles());
                                                    setSelectedProfileName(null);
                                                    loadPageByAction({
                                                        code: ACTION_NAME.RELOAD,
                                                        args: null,
                                                    });
                                                }}
                                            >
                                                <LockIcon/>
                                            </IconButton>
                                        </Tooltip>
                                    </ToggleButtonGroup>
                                }
                                onChange={(_, newValue) => {
                                    if (null === newValue || "string" !== typeof newValue) {
                                        throw new Error(`Unexpected newValue: ${newValue}`);
                                    }
                                    setSelectedProfileName(newValue);
                                }}
                            >
                                {Array.from(profilesMetadata).map(([profileName, metadata]) => (
                                    <Option
                                        key={profileName}
                                        value={profileName}
                                    >
                                        <Typography sx={{flexGrow: 1}}>
                                            {profileName}
                                        </Typography>
                                        <Stack
                                            direction={"row"}
                                            gap={1}
                                        >
                                            {metadata.isLocalStorage && (
                                                <Tooltip title={"Locally stored"}>
                                                    <SdStorageIcon/>
                                                </Tooltip>
                                            )}
                                            {metadata.isForced && (
                                                <Tooltip title={"Forced"}>
                                                    <LockIcon/>
                                                </Tooltip>
                                            )}
                                            {activatedProfileName === profileName && (
                                                <Tooltip title={"Active"}>
                                                    <CheckBoxIcon/>
                                                </Tooltip>
                                            )}
                                        </Stack>
                                    </Option>
                                ))}
                            </Select>
                            <Dropdown>
                                <MenuButton
                                    size={"sm"}
                                    sx={{paddingInline: "6px"}}
                                    variant={"soft"}
                                >
                                    <AddIcon/>
                                </MenuButton>
                                <Menu
                                    placement={"bottom-end"}
                                    size={"sm"}
                                >
                                    <Stack
                                        direction={"row"}
                                        paddingInline={1}
                                        spacing={1}
                                    >
                                        <FormControl>
                                            <Input
                                                placeholder={"New Profile Name"}
                                                size={"sm"}
                                                sx={{minWidth: "24ch"}}
                                                value={newProfileName}
                                                onChange={(ev) => {
                                                    setNewProfileName(ev.target.value);
                                                    defer(() => {
                                                        // Prevent the confirm button from receiving
                                                        // focus when the input value changes.
                                                        ev.target.focus();
                                                    });
                                                }}/>
                                        </FormControl>
                                        <MenuItem
                                            disabled={0 === newProfileName.length}
                                            sx={{borderRadius: "2px"}}
                                            onClick={() => {
                                                const result = createProfile(newProfileName);
                                                if (result) {
                                                    setProfilesMetadata(listProfiles());
                                                    setSelectedProfileName(newProfileName);
                                                }
                                            }}
                                        >
                                            <CheckIcon/>
                                        </MenuItem>
                                    </Stack>
                                </Menu>
                            </Dropdown>
                        </Stack>
                        <FormHelperText>
                            Below fields are managed by the selected profile.
                        </FormHelperText>
                    </FormControl>

                    {null !== selectedProfileName &&
                        getConfigFormFields(selectedProfileName).map((field, index) => (
                            <FormControl key={index}>
                                <FormLabel>
                                    {field.label}
                                </FormLabel>
                                <Input
                                    defaultValue={field.initialValue}
                                    name={field.key}
                                    type={field.type}/>
                                <FormHelperText>
                                    {field.helperText}
                                </FormHelperText>
                            </FormControl>
                        ))}
                </Box>
                <Divider/>
                <Button
                    color={"primary"}
                    disabled={false === canApply}
                    type={"submit"}
                >
                    Apply
                </Button>
                <Button
                    color={"neutral"}
                    type={"reset"}
                >
                    Reset Default
                </Button>
            </form>
        </CustomTabPanel>
    );
};

export default SettingsTabPanel;
