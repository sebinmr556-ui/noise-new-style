import { useEffect, useRef } from 'react';
import AgoraRTC, { IAgoraRTCClient, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';

// ക്ലയന്റ് ക്രിയേറ്റ് ചെയ്യുന്നു
const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

export function useAgoraAudio(
  roomId: string,
  isSpeaker: boolean,
  isMuted: boolean,
  uid: string
) {
  const localTrackRef = useRef<IMicrophoneAudioTrack | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initAgora = async () => {
      // നിങ്ങളുടെ യഥാർത്ഥ Agora App ID
      const appId = "e21e0ed62adc4f7786c81754997bf42d"; 
      
      // ശ്രദ്ധിക്കുക: താഴെ നിങ്ങൾ ഇപ്പോൾ കോപ്പി ചെയ്ത നീളമുള്ള ടോക്കൺ കൊടുക്കുക
      const token = "നിങ്ങൾ_കോപ്പി_ചെയ്ത_നീളമുള്ള_ടോക്കൺ_ഇവിടെ_പേസ്റ്റ്_ചെയ്യുക";
      
      try {
        // റൂമിലേക്ക് കണക്ട് ചെയ്യുന്നു (ടെസ്റ്റ് ചെയ്യാൻ വേണ്ടി testroom, 1001 എന്നിവ കൊടുത്തു)
        await client.join(appId, "testroom", token, 1001);

        // മറ്റാരെങ്കിലും സംസാരിക്കുമ്പോൾ ആ ഓഡിയോ പ്ലേ ചെയ്യുന്നു
        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === "audio") {
            const remoteAudioTrack = user.audioTrack;
            remoteAudioTrack?.play(); // ഓഡിയോ ഫോണിൽ കേൾക്കാൻ
          }
        });

      } catch (error) {
        console.error("Agora join error:", error);
      }
    };

    if (roomId && uid) {
      initAgora();
    }

    return () => {
      isMounted = false;
      if (localTrackRef.current) {
        localTrackRef.current.close();
        client.unpublish([localTrackRef.current]);
      }
      client.leave(); // റൂമിൽ നിന്ന് പുറത്തിറങ്ങുമ്പോൾ കണക്ഷൻ കട്ട് ആവാൻ
    };
  }, [roomId, uid]);

  // മൈക്ക് ഓൺ / ഓഫ് ആക്കുന്നതും, സ്പീക്കർ സീറ്റിൽ കയറുന്നതും കൺട്രോൾ ചെയ്യാൻ
  useEffect(() => {
    const handleMicState = async () => {
      try {
        if (isSpeaker) {
          // സീറ്റിൽ കയറുമ്പോൾ മൈക്ക് ആക്റ്റീവ് ആക്കുന്നു
          if (!localTrackRef.current) {
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            localTrackRef.current = audioTrack;
            await client.publish([audioTrack]);
          }
          // മ്യൂട്ട് ബട്ടൺ അമർത്തുമ്പോൾ
          localTrackRef.current?.setMuted(isMuted);
        } else {
          // സീറ്റിൽ നിന്ന് ഇറങ്ങുമ്പോൾ മൈക്ക് ഓഫ് ആക്കുന്നു
          if (localTrackRef.current) {
            await client.unpublish([localTrackRef.current]);
            localTrackRef.current.close();
            localTrackRef.current = null;
          }
        }
      } catch (error) {
        console.error("Mic error:", error);
      }
    };

    handleMicState();
  }, [isSpeaker, isMuted]);
}
