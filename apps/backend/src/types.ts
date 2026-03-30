export type UserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
};

export type ProjectRecord = {
  id: string;
  ownerId: string;
  name: string;
  buildingType: string;
  climateZone?: string;
  params?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
