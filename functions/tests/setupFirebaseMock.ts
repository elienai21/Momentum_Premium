jest.mock('firebase-admin', () => {
  const data: any[] = [];
  const authMock = {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'mock-user', email: 'mock-user@example.com' }),
    getUser: jest.fn().mockResolvedValue({ uid: 'mock-user' }),
    setCustomUserClaims: jest.fn().mockResolvedValue(null),
  };
  return {
    apps: [],
    initializeApp: jest.fn(),
    app: jest.fn(() => ({})),
    firestore: () => ({
      collection: () => ({
        doc: (id?: string) => ({
          set: jest.fn().mockResolvedValue(null),
        }),
        add: jest.fn().mockImplementation((obj: any) => Promise.resolve({ id: String(Date.now()), ...obj })),
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ docs: [] })
        }),
      }),
    }),
    auth: () => authMock,
    storage: () => ({
      bucket: () => ({
        file: () => ({
          getSignedUrl: jest.fn().mockResolvedValue('https://mock'),
        }),
      }),
    }),
  };
});
