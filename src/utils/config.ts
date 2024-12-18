import axios from "axios";

import {Nullable} from "../typings/common";
import {
    CONFIG_KEY,
    ConfigMap,
    ConfigUpdate,
    LOCAL_STORAGE_KEY,
    Profile,
    THEME_NAME,
} from "../typings/config";
import {TAB_NAME} from "../typings/tab";


const EXPORT_LOGS_CHUNK_SIZE = 10_000;
const MAX_PAGE_SIZE = 1_000_000;
const QUERY_CHUNK_SIZE = 10_000;

/**
 * The default configuration values.
 */
const CONFIG_DEFAULT: ConfigMap = Object.freeze({
    [CONFIG_KEY.DECODER_OPTIONS]: {
        formatString: "",
        logLevelKey: "log.level",
        timestampKey: "@timestamp",
    },
    [CONFIG_KEY.INITIAL_TAB_NAME]: TAB_NAME.FILE_INFO,
    [CONFIG_KEY.THEME]: THEME_NAME.SYSTEM,
    [CONFIG_KEY.PAGE_SIZE]: 10_000,
});

// Global variables
const DEFAULT_PROFILE_NAME = "Default";
let ACTIVATED_PROFILE_NAME: Nullable<string> = null;
const PROFILES: Map<string, Profile> = new Map();


// Helpers
/**
 *
 * @param profileName
 */
const getProfileLocalStorageKey =
    (profileName: string) => (LOCAL_STORAGE_KEY.PROFILE_PREFIX + profileName);

interface ProfileInitProps {
    filePath: Nullable<string>,
}

/**
 * Initializes the profile system, loads profiles, and activates the appropriate profile.
 *
 * @param initProps Initialization properties containing the file path.
 * @param initProps.filePath
 * @return The name of the activated profile.
 */
const initProfiles = async (initProps:ProfileInitProps): Promise<string> => {
    PROFILES.clear();

    // Load profiles from profile-presets.json
    try {
        const {data} = await axios.get<Record<string, Profile>>("profile-presets.json");
        Object.entries(data).forEach(([profileName, profileData]) => {
            PROFILES.set(profileName, profileData);
        });
    } catch (e) {
        console.error(`Failed to fetch profile-presets.json: ${JSON.stringify(e)}`);
    }

    Object.keys(window.localStorage).forEach((key: string) => {
        if (key.startsWith(LOCAL_STORAGE_KEY.PROFILE_PREFIX)) {
            const profileName = key.substring(LOCAL_STORAGE_KEY.PROFILE_PREFIX.length);
            const profileStr = window.localStorage.getItem(key);

            // The `null` check is to satisfy TypeScript.
            if (null === profileStr) {
                return;
            }

            try {
                // FIXME
                const profile = JSON.parse(profileStr) as Profile;
                const existingProfile = PROFILES.get(profileName);
                if (
                    "undefined" === typeof existingProfile ||
                    existingProfile.lastModificationTimestampMillis <
                    profile.lastModificationTimestampMillis
                ) {
                    PROFILES.set(profileName, profile);
                }
            } catch (e) {
                console.error(
                    `Error parsing profile ${profileName} from localStorage: ${String(e)}`,
                );
            }
        }
    });

    if (false === PROFILES.has(DEFAULT_PROFILE_NAME)) {
        // First time launching the app
        const defaultProfile: Profile = {
            config: structuredClone(CONFIG_DEFAULT),
            filePathPrefixes: [],
            lastModificationTimestampMillis: Date.now(),
        };

        PROFILES.set(DEFAULT_PROFILE_NAME, defaultProfile);
        ACTIVATED_PROFILE_NAME = DEFAULT_PROFILE_NAME;

        return ACTIVATED_PROFILE_NAME;
    }

    const profileOverride = window.localStorage.getItem(LOCAL_STORAGE_KEY.PROFILE_OVERRIDE);
    if (null !== profileOverride) {
        // If override exist, apply the config and return
        ACTIVATED_PROFILE_NAME = profileOverride;

        return ACTIVATED_PROFILE_NAME;
    }

    // Determine profile based on filePath
    const {filePath} = initProps;
    if (null !== filePath) {
        let bestMatchEndIdx = 0;
        PROFILES.forEach((profile, profileName) => {
            for (const prefix of profile.filePathPrefixes) {
                const matchBeginIdx = filePath.indexOf(prefix);
                if (-1 !== matchBeginIdx) {
                    const matchEndIdx = matchBeginIdx + prefix.length;
                    if (matchEndIdx > bestMatchEndIdx) {
                        bestMatchEndIdx = matchBeginIdx;
                        ACTIVATED_PROFILE_NAME = profileName;
                    }
                }
            }
        });
    }

    if (null === ACTIVATED_PROFILE_NAME) {
        ACTIVATED_PROFILE_NAME = DEFAULT_PROFILE_NAME;
    }

    return ACTIVATED_PROFILE_NAME;
};

/**
 * Validates the config denoted by the given key and value.
 *
 * @param props
 * @param props.key
 * @param props.value
 * @return `null` if the value is valid, or an error message otherwise.
 * @throws {Error} If the config item cannot be managed by these config utilities.
 */
const testConfig = ({key, value}: ConfigUpdate): Nullable<string> => {
    let result = null;
    switch (key) {
        case CONFIG_KEY.DECODER_OPTIONS:
            if (0 === value.timestampKey.length) {
                result = "Timestamp key cannot be empty.";
            } else if (0 === value.logLevelKey.length) {
                result = "Log level key cannot be empty.";
            }
            break;
        case CONFIG_KEY.INITIAL_TAB_NAME:
            // This config option is not intended for direct user input.
            break;
        case CONFIG_KEY.THEME:
            throw new Error(`"${key}" cannot be managed using these utilities.`);
        case CONFIG_KEY.PAGE_SIZE:
            if (0 >= value || MAX_PAGE_SIZE < value) {
                result = `Page size must be greater than 0 and less than ${MAX_PAGE_SIZE + 1}.`;
            }
            break;
        default:
            break;
    }

    return result;
};

/**
 *
 */
const getActivatedProfile = (): Profile => {
    if (null === ACTIVATED_PROFILE_NAME) {
        throw new Error("No active profile");
    }

    const activatedProfile = PROFILES.get(ACTIVATED_PROFILE_NAME);
    if ("undefined" === typeof activatedProfile) {
        throw new Error(`Activated profile ${ACTIVATED_PROFILE_NAME} is not found`);
    }

    return activatedProfile;
};

/**
 * Saves the current configuration to the active profile in localStorage.
 */
const saveProfile = (): void => {
    if (null === ACTIVATED_PROFILE_NAME) {
        throw new Error("No active profile");
    }

    const profileKey = getProfileLocalStorageKey(ACTIVATED_PROFILE_NAME);
    const profile = getActivatedProfile();
    profile.lastModificationTimestampMillis = Date.now();
    window.localStorage.setItem(profileKey, JSON.stringify(profile));
};

/**
 * Updates the config denoted by the given key and value.
 *
 * @param props
 * @param props.key
 * @param props.value
 * @return `null` if the update succeeds, or an error message otherwise.
 * @throws {Error} If the config item cannot be managed by these config utilities.
 */
const setConfig = ({key, value}: ConfigUpdate): Nullable<string> => {
    if (null === ACTIVATED_PROFILE_NAME) {
        throw new Error("No active profile");
    }

    const error = testConfig({key, value} as ConfigUpdate);
    if (null !== error) {
        console.error(`Unable to set ${key}=${JSON.stringify(value)}: ${error}`);

        return error;
    }

    const {config: activatedConfig} = getActivatedProfile();

    // @ts-expect-error TS cannot match the key's type with the value's type
    activatedConfig[key] = value;
    saveProfile();

    return null;
};


/**
 * Retrieves the config value for the specified key.
 *
 * @param key
 * @return The value.
 * @throws {Error} If the config item cannot be managed by these config utilities.
 */
const getConfig = <T extends CONFIG_KEY>(key: T): ConfigMap[T] => {
    const {config: activatedConfig} = getActivatedProfile();

    return activatedConfig[key];
};

/**
 * Deletes a profile by name.
 *
 * @param profileName The name of the profile to delete.
 * @throws Error if the specified profile is currently activated.
 */
const deleteProfile = (profileName: string) => {
    if (false === PROFILES.has(profileName)) {
        throw new Error(`Deleting an unknown profile: ${profileName}`);
    }

    const profileKey = getProfileLocalStorageKey(profileName);
    window.localStorage.removeItem(profileKey);
};

/**
 * Sets a profile override and activates the specified profile.
 * If profileName is null, removes the override.
 *
 * @param profileName The name of the profile to activate or null to remove override.
 */
const lockProfile = (profileName: string | null): void => {
    if (null === profileName) {
        // Remove override
        window.localStorage.removeItem(LOCAL_STORAGE_KEY.PROFILE_OVERRIDE);

        // FIXME: Reinitialize to determine `ACTIVATED_PROFILE_NAME` based on filePath
        return;
    }

    if (false === PROFILES.has(profileName)) {
        throw new Error(`Locking an unknown profile: ${profileName}`);
    }
    window.localStorage.setItem(LOCAL_STORAGE_KEY.PROFILE_OVERRIDE, profileName);
};

/**
 * Returns the activated profile name and a list of all available profiles.
 *
 * @return An object containing the activated profile and list of profiles.
 */
const listProfiles = (): {
    activated: string;
    profiles: Map<string, Profile>;
} => {
    if (null === ACTIVATED_PROFILE_NAME) {
        throw new Error("No active profile");
    }

    return {
        activated: ACTIVATED_PROFILE_NAME,
        profiles: PROFILES,
    };
};

export {
    CONFIG_DEFAULT,
    deleteProfile,
    EXPORT_LOGS_CHUNK_SIZE,
    getConfig,
    initProfiles,
    listProfiles,
    lockProfile,
    QUERY_CHUNK_SIZE,
    saveProfile,
    setConfig,
    testConfig,
};
