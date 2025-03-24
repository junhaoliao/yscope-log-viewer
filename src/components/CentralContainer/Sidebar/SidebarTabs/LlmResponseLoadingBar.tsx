import {
    Box,
    Skeleton,
} from "@mui/joy";


const SKELETON_COMMON_STYLES = {
    marginLeft: "0.3em",
    display: "inline",
    borderRadius: "1em",
    float: "left",
};

/**
 * Renders skeletons which indicates loading LLM response.
 *
 * @return
 */
const LlmResponseLoadingBar = () => {
    return (
        <Box>
            <Skeleton
                animation={"wave"}
                level={"body-xs"}
                loading={true}
                sx={{...SKELETON_COMMON_STYLES, width: "20em"}}
                variant={"text"}/>
            <Skeleton
                animation={"wave"}
                level={"body-xs"}
                loading={true}
                sx={{...SKELETON_COMMON_STYLES, width: "2em"}}
                variant={"text"}/>
            {" "}
            <Skeleton
                animation={"wave"}
                level={"body-xs"}
                loading={true}
                sx={{...SKELETON_COMMON_STYLES, width: "15em"}}
                variant={"text"}/>
            <Skeleton
                animation={"wave"}
                level={"body-xs"}
                loading={true}
                sx={{...SKELETON_COMMON_STYLES, width: "12em"}}
                variant={"text"}/>
            {" "}
            <Skeleton
                animation={"wave"}
                level={"body-xs"}
                loading={true}
                sx={{...SKELETON_COMMON_STYLES, width: "7em"}}
                variant={"text"}/>
        </Box>
    );
};

export default LlmResponseLoadingBar;
