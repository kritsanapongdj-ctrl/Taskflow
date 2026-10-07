import { db, ensureAuth, collection, getDocs } from '../api/_services/firebase.js';

async function check() {
  console.log("Checking Firestore drafts...");
  await ensureAuth();
  const snap = await getDocs(collection(db, 'artifacts', 'default-app-id', 'public', 'data', 'flood_drafts'));
  console.log("Total drafts:", snap.size);
  for (const d of snap.docs) {
    const data = d.data();
    const photosSnap = await getDocs(collection(db, 'artifacts', 'default-app-id', 'public', 'data', 'flood_drafts', d.id, 'photos'));
    console.log(`\nUser: ${d.id}`);
    console.log(`Project: [${data.projectCode}] ${data.projectName}`);
    console.log(`Photos in subcollection: ${photosSnap.size}`);
    console.log(`finalizing: ${data.finalizing}, finalizingAt: ${data.finalizingAt}`);
    console.log(`createdAt: ${new Date(data.createdAt).toLocaleString('th-TH')}`);
    console.log(`lastPhotoAt: ${data.lastPhotoAt ? new Date(data.lastPhotoAt).toLocaleString('th-TH') : '-'}`);
  }
  process.exit(0);
}

check().catch(e => {
  console.error("Error:", e);
  process.exit(1);
});
