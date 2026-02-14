<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Education;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class ProfileController extends Controller
{
    public function show()
    {
        $user = auth()->user();
        $user->load('educations');
        $user->append('profile_completion');

        return response()->json($user);
    }

    public function update(Request $request)
    {
        $user = auth()->user();

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $user->id,
            'status' => 'nullable|in:working,busy,in_meeting,vacation,offline',
            'phone' => 'nullable|string|max:20',
            'phone2' => 'nullable|string|max:20',
            'department' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'skills' => 'nullable|array',
            'skills.*' => 'string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->only([
            'name', 'email', 'status', 'phone', 'phone2',
            'department', 'location', 'skills',
        ]);

        $user->update($data);
        $this->recalcCompletion($user);

        $user->load('educations');
        $user->append('profile_completion');

        return response()->json($user);
    }

    public function updateAddress(Request $request)
    {
        $user = auth()->user();

        $addressFields = [
            'present_village', 'present_city', 'present_thana',
            'present_post_office', 'present_division', 'present_country',
            'permanent_village', 'permanent_city', 'permanent_thana',
            'permanent_post_office', 'permanent_division', 'permanent_country',
        ];

        $rules = [];
        foreach ($addressFields as $field) {
            $rules[$field] = 'nullable|string|max:255';
        }
        $rules['same_as_permanent'] = 'nullable|boolean';

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->only(array_merge($addressFields, ['same_as_permanent']));

        // If same_as_permanent is checked, copy present → permanent
        if ($request->boolean('same_as_permanent')) {
            $data['permanent_village'] = $data['present_village'] ?? $user->present_village;
            $data['permanent_city'] = $data['present_city'] ?? $user->present_city;
            $data['permanent_thana'] = $data['present_thana'] ?? $user->present_thana;
            $data['permanent_post_office'] = $data['present_post_office'] ?? $user->present_post_office;
            $data['permanent_division'] = $data['present_division'] ?? $user->present_division;
            $data['permanent_country'] = $data['present_country'] ?? $user->present_country;
        }

        $user->update($data);
        $this->recalcCompletion($user);

        $user->append('profile_completion');

        return response()->json($user);
    }

    public function changePassword(Request $request)
    {
        $user = auth()->user();

        $validator = Validator::make($request->all(), [
            'old_password' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if (!Hash::check($request->old_password, $user->password)) {
            return response()->json(['errors' => ['old_password' => ['Current password is incorrect.']]], 422);
        }

        if ($request->old_password === $request->password) {
            return response()->json(['errors' => ['password' => ['New password must be different from current password.']]], 422);
        }

        $user->update([
            'password' => $request->password,
            'password_changed' => true,
        ]);

        $this->recalcCompletion($user);
        $user->append('profile_completion');

        return response()->json(['message' => 'Password changed successfully', 'user' => $user]);
    }

    public function uploadAvatar(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'avatar' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = auth()->user();

        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->update(['avatar' => $path]);
        $this->recalcCompletion($user);

        $user->append('profile_completion');

        return response()->json(['avatar' => $path, 'user' => $user]);
    }

    public function uploadCv(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'cv' => 'required|mimes:pdf,doc,docx|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = auth()->user();

        if ($user->cv_path) {
            Storage::disk('public')->delete($user->cv_path);
        }

        $path = $request->file('cv')->store('cvs', 'public');
        $user->update(['cv_path' => $path]);
        $this->recalcCompletion($user);

        $user->append('profile_completion');

        return response()->json(['cv_path' => $path, 'user' => $user]);
    }

    public function deleteCv()
    {
        $user = auth()->user();

        if ($user->cv_path) {
            Storage::disk('public')->delete($user->cv_path);
            $user->update(['cv_path' => null]);
            $this->recalcCompletion($user);
        }

        $user->append('profile_completion');

        return response()->json(['user' => $user]);
    }

    // Education CRUD
    public function educations()
    {
        $user = auth()->user();
        return response()->json($user->educations()->orderBy('id')->get());
    }

    public function storeEducation(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'level' => 'required|string|max:100',
            'institution' => 'required|string|max:255',
            'passing_year' => 'nullable|string|max:10',
            'result' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $education = auth()->user()->educations()->create($request->only([
            'level', 'institution', 'passing_year', 'result',
        ]));

        $this->recalcCompletion(auth()->user());

        return response()->json($education, 201);
    }

    public function updateEducation(Request $request, $id)
    {
        $education = Education::where('user_id', auth()->id())->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'level' => 'sometimes|required|string|max:100',
            'institution' => 'sometimes|required|string|max:255',
            'passing_year' => 'nullable|string|max:10',
            'result' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $education->update($request->only(['level', 'institution', 'passing_year', 'result']));

        return response()->json($education);
    }

    public function destroyEducation($id)
    {
        $education = Education::where('user_id', auth()->id())->findOrFail($id);
        $education->delete();

        $this->recalcCompletion(auth()->user());

        return response()->json(['message' => 'Education removed']);
    }

    private function recalcCompletion($user): void
    {
        $user->refresh();
        $user->update(['profile_completed' => $user->profile_completion >= 100]);
    }
}
