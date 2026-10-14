  const handleAddUserStory = () => {
    if (!currentUser) return setIsLoginModalOpen(true);
    const input = document.createElement('input');
    input.type = 'file';
    // വീഡിയോ കൂടി സെലക്ട് ചെയ്യാൻ കൊടുക്കുന്നു
    input.accept = 'image/*,video/mp4,video/webm,video/quicktime'; 
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Firestore-ൽ 1MB ലിമിറ്റ് ഉള്ളതുകൊണ്ട് വലിയ വീഡിയോകൾ തടയാനുള്ള കോഡ്
      if (file.type.startsWith('video/') && file.size > 1048576) { // 1 MB = 1048576 bytes
        alert("ഫയർബേസ് ഫയർസ്റ്റോറിൽ 1MB വരെയുള്ള ചെറിയ വീഡിയോകൾ മാത്രമേ നേരിട്ട് സേവ് ചെയ്യാൻ കഴിയൂ. ദയവായി ചെറിയൊരു വീഡിയോ തിരഞ്ഞെടുക്കുക.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const raw = ev.target?.result as string;

        // ഫയൽ വീഡിയോ ആണെങ്കിൽ നേരിട്ട് സേവ് ചെയ്യുന്നു
        if (file.type.startsWith('video/')) {
          if (isFirebaseConfigured && db) {
            try {
              addDoc(collection(db, 'stories'), {
                uid: currentUser.uid,
                username: currentUser.username,
                avatar: currentUser.photoURL,
                mediaUrl: raw,
                caption: 'My video moment 🎥',
                createdAt: serverTimestamp(),
              });
            } catch (err) {
              console.warn('Video story save error:', err);
            }
          }
        } else {
          // ഫയൽ ഇമേജ് ആണെങ്കിൽ പഴയതുപോലെ ക്യാൻവാസ് ഉപയോഗിച്ച് ക്രോപ്പ് ചെയ്ത് സേവ് ചെയ്യുന്നു
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            const MAX = 800;
            let w = img.width, h = img.height;
            if (w > h) { if (w > MAX) { h = Math.round((h * MAX) / w); w = MAX; } } 
            else { if (h > MAX) { w = Math.round((h * MAX) / h); h = MAX; } }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              const mediaUrl = canvas.toDataURL('image/jpeg', 0.85);
              if (isFirebaseConfigured && db) {
                try {
                  await addDoc(collection(db, 'stories'), {
                    uid: currentUser.uid,
                    username: currentUser.username,
                    avatar: currentUser.photoURL,
                    mediaUrl: mediaUrl,
                    caption: 'My moment ✨',
                    createdAt: serverTimestamp(),
                  });
                } catch (err) {}
              }
            }
          };
          img.src = raw;
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };
