jest.mock('../../../models/user');

const User = require('../../../models/user');
const { getUser, updateUser, deleteUser } = require('../../../controllers/usersController');
const { mockRequest, mockResponse } = require('../../helpers/mockExpress');

describe('controllers/usersController', () => {
  describe('getUser', () => {
    it('returns 403 when requesting another user\'s profile as a non-admin', async () => {
      const req = mockRequest({ params: { id: 'other-id' }, user: { _id: 'me', role: 'user' } });
      const res = mockResponse();

      await getUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(User.findById).not.toHaveBeenCalled();
    });

    it('returns 404 when the user does not exist', async () => {
      User.findById.mockResolvedValue(null);
      const req = mockRequest({ params: { id: 'me' }, user: { _id: 'me', role: 'user' } });
      const res = mockResponse();

      await getUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns the public profile for the owner', async () => {
      const fakeUser = { toPublicJSON: () => ({ _id: 'me', name: 'Jordan' }) };
      User.findById.mockResolvedValue(fakeUser);
      const req = mockRequest({ params: { id: 'me' }, user: { _id: 'me', role: 'user' } });
      const res = mockResponse();

      await getUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { _id: 'me', name: 'Jordan' } });
    });

    it('allows an admin to view another user\'s profile', async () => {
      const fakeUser = { toPublicJSON: () => ({ _id: 'other-id', name: 'Other' }) };
      User.findById.mockResolvedValue(fakeUser);
      const req = mockRequest({ params: { id: 'other-id' }, user: { _id: 'me', role: 'admin' } });
      const res = mockResponse();

      await getUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateUser', () => {
    it('returns 403 when updating another user\'s profile as a non-admin', async () => {
      const req = mockRequest({ params: { id: 'other-id' }, user: { _id: 'me', role: 'user' }, body: { name: 'New' } });
      const res = mockResponse();

      await updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('returns 404 when the user does not exist', async () => {
      User.findByIdAndUpdate.mockResolvedValue(null);
      const req = mockRequest({ params: { id: 'me' }, user: { _id: 'me', role: 'user' }, body: { name: 'New' } });
      const res = mockResponse();

      await updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('updates only the name field, ignoring password/role', async () => {
      const fakeUser = { toPublicJSON: () => ({ _id: 'me', name: 'New Name' }) };
      User.findByIdAndUpdate.mockResolvedValue(fakeUser);
      const req = mockRequest({
        params: { id: 'me' },
        user: { _id: 'me', role: 'user' },
        body: { name: 'New Name', password: 'hacked', role: 'admin' },
      });
      const res = mockResponse();

      await updateUser(req, res);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'me',
        { name: 'New Name' },
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { _id: 'me', name: 'New Name' } });
    });
  });

  describe('deleteUser', () => {
    it('returns 403 when deleting another user\'s account as a non-admin', async () => {
      const req = mockRequest({ params: { id: 'other-id' }, user: { _id: 'me', role: 'user' } });
      const res = mockResponse();

      await deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(User.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('deletes the account and returns 204', async () => {
      User.findByIdAndDelete.mockResolvedValue({});
      const req = mockRequest({ params: { id: 'me' }, user: { _id: 'me', role: 'user' } });
      const res = mockResponse();

      await deleteUser(req, res);

      expect(User.findByIdAndDelete).toHaveBeenCalledWith('me');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('allows an admin to delete another user\'s account', async () => {
      User.findByIdAndDelete.mockResolvedValue({});
      const req = mockRequest({ params: { id: 'other-id' }, user: { _id: 'me', role: 'admin' } });
      const res = mockResponse();

      await deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
    });
  });
});
