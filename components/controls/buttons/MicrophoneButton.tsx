import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  ButtonGroup,
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Tooltip,
  Text,
} from "@chakra-ui/react";
import { useHotkeys } from "react-hotkeys-hook";
import { AiOutlineCheck } from "react-icons/ai";

import UserContext from "context/user";
import { useDevices } from "hooks/useDevices";
import { useLocalParticipant } from "hooks/useLocalParticipant";

import ChevronIcon from "components/icons/ChevronIcon";
import MuteMicrophoneIcon from "components/icons/MuteMicrophoneIcon";
import UnmuteMicrophoneIcon from "components/icons/UnmuteMicrophoneIcon";

export default function MicrophoneButton(): JSX.Element {
  const {
    microphoneMuted,
    setMicrophoneMuted,
    microphoneDeviceId,
    setMicrophoneDeviceId,
  } = React.useContext(UserContext);
  const {
    microphoneDevices,
    getMicrophoneDevice,
    activeMicrophone,
    getActiveMicrophoneLevel,
  } = useDevices();
  const localParticipant = useLocalParticipant();
  const [temporaryUnmute, setTemporaryUnmute] = useState(false);
  const [mouseOver, setMouseOver] = useState(false);
  const [micLevelPercent, setMicLevelPercent] = useState(0);
  const [micDistorted, setMicDistorted] = useState(false);

  const requestRef = React.useRef<number>();

  const selectAudioDevice = useCallback(
    async (deviceId: string) => {
      setMicrophoneDeviceId(deviceId);
      const tracks = await getMicrophoneDevice(deviceId);
      localParticipant?.updateTracks(tracks);
    },
    [setMicrophoneDeviceId, localParticipant, getMicrophoneDevice]
  );

  const toggleMicrophone = useCallback(() => {
    if (microphoneMuted) {
      setMicrophoneMuted(false);
      activeMicrophone?.unMute();
    } else {
      setMicrophoneMuted(true);
      activeMicrophone?.mute();
    }
  }, [activeMicrophone, microphoneMuted, setMicrophoneMuted]);

  const animateMeter = useCallback(() => {
    if (requestRef.current != undefined && getActiveMicrophoneLevel) {
      let levels = getActiveMicrophoneLevel();

      if (levels) {
        // Convert to 0-100 scale
        let scaled = (Math.max(-60, levels.avgDb) + 60) * 1.66;
        setMicLevelPercent(scaled);

        if (levels.peakDb > -0.5) {
          setMicDistorted(true);
        } else {
          setMicDistorted(false);
        }
      } else {
        setMicLevelPercent(0);
        setMicDistorted(false);
      }
    }
    requestRef.current = requestAnimationFrame(animateMeter);
  }, [getActiveMicrophoneLevel]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animateMeter);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animateMeter]);

  const hotkeyText = "⌘ + d"; // adding this here to make it easy to change later. appears in tooltip on button.
  useHotkeys(
    "cmd+d,ctrl+d",
    (e) => {
      e.preventDefault();
      toggleMicrophone();
    },
    [activeMicrophone, microphoneMuted, setMicrophoneMuted]
  );

  useHotkeys(
    "space",
    (e: Event) => {
      e.preventDefault();
      if (microphoneMuted && !temporaryUnmute) {
        activeMicrophone?.unMute();
        setTemporaryUnmute(true);
      }
    },
    { keydown: true },
    [activeMicrophone, microphoneMuted, temporaryUnmute]
  );
  useHotkeys(
    "space",
    (e: Event) => {
      e.preventDefault();
      if (temporaryUnmute) {
        setTemporaryUnmute(false);
        if (microphoneMuted) {
          activeMicrophone?.mute();
        }
      }
    },
    { keyup: true },
    [activeMicrophone, microphoneMuted, temporaryUnmute]
  );

  const ariaLabel = microphoneMuted ? "Unmute" : "Mute";

  return (
    <ButtonGroup size="sm" isAttached variant="outline">
      <Tooltip
        label={
          microphoneMuted ? `Unmute (${hotkeyText})` : `Mute (${hotkeyText})`
        }
      >
        <IconButton
          width="60px"
          height="60px"
          variant="link"
          aria-label={ariaLabel}
          onMouseEnter={() => setMouseOver(true)}
          onMouseLeave={() => setMouseOver(false)}
          icon={
            microphoneMuted && !temporaryUnmute ? (
              <MuteMicrophoneIcon />
            ) : (
              <UnmuteMicrophoneIcon />
            )
          }
          onClick={toggleMicrophone}
          style={
            mouseOver || micDistorted
              ? {
                  background:
                    "radial-gradient(50% 50% at 50% 50%, rgba(251, 36, 145, 0.6) 0%, rgba(251, 36, 145, 0) 100%)",
                }
              : {
                  background: `radial-gradient(50% 50% at 50% 50%, rgba(36, 251, 40, 0.6) 0%, rgba(36, 251, 40, 0) ${micLevelPercent}%)`,
                }
          }
        />
      </Tooltip>
      <Menu placement="top">
        <MenuButton
          as={IconButton}
          aria-label="Options"
          icon={<ChevronIcon />}
          variant="link"
          marginLeft="-16px"
          zIndex={100}
        />
        <MenuList
          background="#383838"
          border="1px solid #323232"
          color="#CCCCCC"
          padding="5px 10px"
        >
          <Text userSelect="none" paddingX="12px" paddingY="6px">
            MICROPHONE
          </Text>
          {microphoneDevices.map((device: MediaDeviceInfo) => {
            return (
              <MenuItem
                key={device.deviceId}
                onClick={() => selectAudioDevice(device.deviceId)}
              >
                <Flex alignItems="center">
                  {device.label}
                  {microphoneDeviceId == device.deviceId && (
                    <Box marginLeft="10px">
                      <AiOutlineCheck />
                    </Box>
                  )}
                </Flex>
              </MenuItem>
            );
          })}
        </MenuList>
      </Menu>
    </ButtonGroup>
  );
}
