/**
 * Client-Side School Registration Service
 * 
 * SECURITY INVARIANTS:
 * 1. This module runs strictly in the browser environment.
 * 2. It NEVER imports or uses the Firebase Admin SDK, service account keys,
 *    or functions/ directly.
 * 3. It does NOT set custom claims or write canonical school documents directly.
 * 4. All registration requests are submitted to the trusted server-side provisioning engine
 *    via Firebase Functions v2 onCall callable mechanism ('provisionSchool' in 'asia-south1').
 * 5. Formatting errors sanitizes any internal messages to prevent leaking
 *    internal credentials, UIDs, or private account mappings.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';

export interface SchoolRegistrationClientInput {
  udiseCode: string;
  schoolName: string;
  recoveryEmail: string;
  password: string;
  confirmPassword?: string;
  schoolType?: 'PRIMARY' | 'HIGHER_SECONDARY';
  district?: string;
  blockCircle?: string;
  address?: string;
  headTeacherName?: string;
  contactNumber?: string;
}

export interface SchoolRegistrationClientResult {
  success: boolean;
  udiseCode?: string;
  schoolName?: string;
  authUid?: string;
  schoolDocumentPath?: string;
  message?: string;
  error?: string;
  code?: string;
  canRetrySafely?: boolean;
}

export interface FormattedRegistrationError {
  bengali: string;
  english: string;
  code: string;
  canRetrySafely: boolean;
}

/**
 * Backend Dispatcher type for submitting registration requests to the server.
 */
export type BackendRegistrationDispatcher = (
  input: SchoolRegistrationClientInput
) => Promise<SchoolRegistrationClientResult>;

let customBackendDispatcher: BackendRegistrationDispatcher | null = null;

/**
 * Configure a custom backend dispatcher (e.g., for automated testing, emulator bridge,
 * or custom Cloud Function callable).
 */
export function setRegistrationBackendHandler(
  dispatcher: BackendRegistrationDispatcher | null
): void {
  customBackendDispatcher = dispatcher;
}

/**
 * Formats server or network errors into user-friendly, Bengali-aware messages.
 * Guarantees that internal Firebase/Admin details, stack traces, and account existence
 * leaks are never exposed to the user.
 */
export function formatRegistrationError(error: any): FormattedRegistrationError {
  const code = (error?.code || '').toUpperCase();
  const rawMessage = error?.message || '';

  if (code === 'UDISE_ALREADY_EXISTS' || code === 'AUTH/UDISE-ALREADY-IN-USE' || code === 'ALREADY-EXISTS') {
    return {
      bengali: 'এই ইউডাইস কোডটি (UDISE Code) ইতিমধ্যেই নিবন্ধিত।',
      english: 'This UDISE Code is already registered for another school. If this is your school, please sign in or use Forgot Password.',
      code: 'UDISE_ALREADY_EXISTS',
      canRetrySafely: false,
    };
  }

  if (code === 'BENCHMARK_PROTECTED' || code === 'PERMISSION-DENIED') {
    return {
      bengali: 'এই বিদ্যালয়টি সংরক্ষিত এবং পুনরায় নিবন্ধন করা যাবে না।',
      english: 'This benchmark school record is protected and cannot be overwritten.',
      code: 'BENCHMARK_PROTECTED',
      canRetrySafely: false,
    };
  }

  if (code === 'PASSWORD_MISMATCH') {
    return {
      bengali: 'পাসওয়ার্ড দুটি মেলেনি। অনুগ্রহ করে আবার যাচাই করুন।',
      english: 'Password and Confirm Password do not match. Please verify both fields.',
      code: 'PASSWORD_MISMATCH',
      canRetrySafely: true,
    };
  }

  if (code === 'INVALID_UDISE' || code === 'AUTH/INVALID-UDISE') {
    return {
      bengali: 'ইউডাইস কোডটি সঠিক নয়। এটি অবশ্যই ১১ সংখ্যার হতে হবে।',
      english: 'Invalid UDISE Code. It must be exactly 11 numeric digits.',
      code: 'INVALID_UDISE',
      canRetrySafely: true,
    };
  }

  if (code === 'INVALID_RECOVERY_EMAIL' || code === 'AUTH/INVALID-EMAIL') {
    return {
      bengali: 'সঠিক রিকভারি ইমেইল ঠিকানা প্রদান করুন।',
      english: 'Please provide a valid recovery email address for password resets.',
      code: 'INVALID_RECOVERY_EMAIL',
      canRetrySafely: true,
    };
  }

  if (code === 'MISSING_SCHOOL_NAME') {
    return {
      bengali: 'বিদ্যালয়ের নাম প্রদান করা আবশ্যক।',
      english: 'School name is required.',
      code: 'MISSING_SCHOOL_NAME',
      canRetrySafely: true,
    };
  }

  if (code === 'WEAK_PASSWORD' || code === 'AUTH/WEAK-PASSWORD') {
    return {
      bengali: 'পাসওয়ার্ডটি অত্যন্ত দুর্বল। অন্তত ৬ বা ততোধিক অক্ষর দিন।',
      english: 'Password is too weak. Please use at least 6 characters.',
      code: 'WEAK_PASSWORD',
      canRetrySafely: true,
    };
  }

  if (code === 'PROVISIONING_FAILED' || code === 'INTERNAL') {
    return {
      bengali: 'সার্ভার প্রোভিশনিং প্রক্রিয়া সম্পন্ন হতে পারেনি এবং সুরক্ষার্থে বাতিল করা হয়েছে। আপনি নিরাপদে পুনরায় চেষ্টা করতে পারেন।',
      english: 'Server provisioning could not complete safely and was rolled back. You may safely retry.',
      code: 'PROVISIONING_FAILED',
      canRetrySafely: true,
    };
  }

  if (code === 'BACKEND_NOT_REACHABLE' || code === 'UNAVAILABLE') {
    return {
      bengali: 'সার্ভার সংযোগ স্থাপন করা সম্ভব হয়নি। অনুগ্রহ করে পরে চেষ্টা করুন।',
      english: 'Unable to connect to the registration service. Please verify your connection or try again later.',
      code: 'BACKEND_NOT_REACHABLE',
      canRetrySafely: true,
    };
  }

  // Network connection error
  if (code === 'AUTH/NETWORK-REQUEST-FAILED' || rawMessage.includes('fetch') || rawMessage.includes('Failed to fetch')) {
    return {
      bengali: 'ইন্টারনেট সংযোগে ত্রুটি। অনুগ্রহ করে আপনার নেটওয়ার্ক চেক করুন।',
      english: 'Network connection failure. Please verify your internet connection and retry.',
      code: 'NETWORK_ERROR',
      canRetrySafely: true,
    };
  }

  // Fallback sanitized error
  return {
    bengali: 'বিদ্যালয় নিবন্ধন সম্পন্ন করা যায়নি। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
    english: 'School registration could not be completed. Please verify your details and try again.',
    code: code || 'UNKNOWN_ERROR',
    canRetrySafely: true,
  };
}

interface ProvisionSchoolCallablePayload {
  udiseCode: string;
  schoolName: string;
  recoveryEmail: string;
  password: string;
  confirmPassword?: string;
  schoolType?: 'PRIMARY' | 'HIGHER_SECONDARY';
  district?: string;
  blockCircle?: string;
  address?: string;
  headTeacherName?: string;
  contactNumber?: string;
}

interface ProvisionSchoolCallableResponse {
  success: boolean;
  udiseCode: string;
  schoolName: string;
  schoolDocumentPath: string;
  message?: string;
}

/**
 * Authoritative client-facing registration entry point.
 * Submits the registration request to the trusted server-side provisioning engine
 * using the Firebase Web SDK's httpsCallable mechanism ('provisionSchool' in 'asia-south1').
 */
export async function registerSchoolWithBackend(
  input: SchoolRegistrationClientInput
): Promise<SchoolRegistrationClientResult> {
  // Client pre-validation: Confirm Password check
  if (input.confirmPassword !== undefined && input.confirmPassword !== input.password) {
    return {
      success: false,
      code: 'PASSWORD_MISMATCH',
      error: 'Password and Confirm Password do not match.',
      canRetrySafely: true,
    };
  }

  // If a custom dispatcher is configured (in test suites or emulator environments), use it
  if (customBackendDispatcher) {
    return await customBackendDispatcher(input);
  }

  // Default production flow: Dispatch using Firebase Web SDK httpsCallable to region asia-south1
  try {
    const functionsInstance = getFunctions(app, 'asia-south1');
    const provisionSchoolCallable = httpsCallable<
      ProvisionSchoolCallablePayload,
      ProvisionSchoolCallableResponse
    >(functionsInstance, 'provisionSchool');

    const result = await provisionSchoolCallable({
      udiseCode: input.udiseCode,
      schoolName: input.schoolName,
      recoveryEmail: input.recoveryEmail,
      password: input.password,
      confirmPassword: input.confirmPassword,
      schoolType: input.schoolType,
      district: input.district,
      blockCircle: input.blockCircle,
      address: input.address,
      headTeacherName: input.headTeacherName,
      contactNumber: input.contactNumber,
    });

    const data = result.data;
    return {
      success: true,
      udiseCode: data.udiseCode,
      schoolName: data.schoolName,
      schoolDocumentPath: data.schoolDocumentPath,
      message: data.message || 'School registration provisioned successfully.',
    };
  } catch (callErr: any) {
    // Extract structured error code from HttpsError details if available
    const code =
      callErr?.details?.code ||
      callErr?.code?.replace('functions/', '')?.toUpperCase() ||
      'PROVISIONING_FAILED';
    const rawMessage = callErr?.message || 'Server error occurred during provisioning.';

    return {
      success: false,
      code,
      error: rawMessage,
      canRetrySafely: code !== 'UDISE_ALREADY_EXISTS' && code !== 'BENCHMARK_PROTECTED',
    };
  }
}
