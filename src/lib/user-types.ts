/** Profil user yang tersimpan di Firestore (`users/{uid}`). */
export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  provider: string;
  createdAt: string;
  lastLoginAt: string;
  orderCount: number;
};
