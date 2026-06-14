import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/db';
import { getInternalAvatarKey } from '@/lib/storage/avatar';
import { assertKeyBelongsToUser } from '@/lib/storage/keys';
import { deleteFile } from '@/lib/storage/files';

export async function PATCH(request: Request) {
  try {
    // 1. Authenticate user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'No autenticado.' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'El cuerpo de la solicitud debe ser un JSON válido.' },
        { status: 400 }
      );
    }

    const { name, avatarUrl, phone, company, department, jobTitle } = body;

    // 3. Validate name (required)
    if (name === undefined || name === null || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'El nombre es requerido y debe ser una cadena de texto.' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      return NextResponse.json(
        { error: 'El nombre debe tener entre 2 y 80 caracteres.' },
        { status: 400 }
      );
    }

    // 4. Validate avatarUrl (optional) and new fields
    const updateData: {
      name: string;
      avatarUrl?: string | null;
      phone?: string | null;
      company?: string | null;
      department?: string | null;
      jobTitle?: string | null;
    } = {
      name: trimmedName,
    };

    if (avatarUrl !== undefined) {
      let normalizedAvatarUrl: string | null = null;
      if (avatarUrl !== null) {
        if (typeof avatarUrl !== 'string') {
          return NextResponse.json(
            { error: 'El avatarUrl debe ser una cadena de texto o null.' },
            { status: 400 }
          );
        }
        const trimmedAvatar = avatarUrl.trim();
        if (trimmedAvatar !== '') {
          if (trimmedAvatar.length > 500) {
            return NextResponse.json(
              { error: 'El avatarUrl no puede exceder los 500 caracteres.' },
              { status: 400 }
            );
          }
          
          const internalKey = getInternalAvatarKey(trimmedAvatar);
          if (internalKey) {
            try {
              assertKeyBelongsToUser(currentUser.id, internalKey);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Clave de avatar no autorizada o inválida.';
              return NextResponse.json(
                { error: msg },
                { status: 403 }
              );
            }
            normalizedAvatarUrl = trimmedAvatar;
          } else {
            try {
              new URL(trimmedAvatar);
            } catch {
              return NextResponse.json(
                { error: 'El avatarUrl debe ser una URL válida o un enlace interno R2.' },
                { status: 400 }
              );
            }
            normalizedAvatarUrl = trimmedAvatar;
          }
        }
      }
      updateData.avatarUrl = normalizedAvatarUrl;
    }

    // Validate and normalize phone (optional)
    if (phone !== undefined) {
      let normalizedPhone: string | null = null;
      if (phone !== null) {
        if (typeof phone !== 'string') {
          return NextResponse.json(
            { error: 'El teléfono debe ser una cadena de texto o null.' },
            { status: 400 }
          );
        }
        const trimmedPhone = phone.trim();
        if (trimmedPhone !== '') {
          if (trimmedPhone.length > 32) {
            return NextResponse.json(
              { error: 'El teléfono no puede exceder los 32 caracteres.' },
              { status: 400 }
            );
          }
          const phoneRegex = /^[+0-9\s\-()]*$/;
          if (!phoneRegex.test(trimmedPhone)) {
            return NextResponse.json(
              { error: 'El teléfono contiene caracteres no válidos.' },
              { status: 400 }
            );
          }
          normalizedPhone = trimmedPhone;
        }
      }
      updateData.phone = normalizedPhone;
    }

    // Validate and normalize company (optional)
    if (company !== undefined) {
      let normalizedCompany: string | null = null;
      if (company !== null) {
        if (typeof company !== 'string') {
          return NextResponse.json(
            { error: 'La empresa debe ser una cadena de texto o null.' },
            { status: 400 }
          );
        }
        const trimmedCompany = company.trim();
        if (trimmedCompany !== '') {
          if (trimmedCompany.length > 100) {
            return NextResponse.json(
              { error: 'La empresa no puede exceder los 100 caracteres.' },
              { status: 400 }
            );
          }
          normalizedCompany = trimmedCompany;
        }
      }
      updateData.company = normalizedCompany;
    }

    // Validate and normalize department (optional)
    if (department !== undefined) {
      let normalizedDept: string | null = null;
      if (department !== null) {
        if (typeof department !== 'string') {
          return NextResponse.json(
            { error: 'El departamento debe ser una cadena de texto o null.' },
            { status: 400 }
          );
        }
        const trimmedDept = department.trim();
        if (trimmedDept !== '') {
          if (trimmedDept.length > 100) {
            return NextResponse.json(
              { error: 'El departamento no puede exceder los 100 caracteres.' },
              { status: 400 }
            );
          }
          normalizedDept = trimmedDept;
        }
      }
      updateData.department = normalizedDept;
    }

    // Validate and normalize jobTitle (optional)
    if (jobTitle !== undefined) {
      let normalizedJob: string | null = null;
      if (jobTitle !== null) {
        if (typeof jobTitle !== 'string') {
          return NextResponse.json(
            { error: 'El cargo debe ser una cadena de texto o null.' },
            { status: 400 }
          );
        }
        const trimmedJob = jobTitle.trim();
        if (trimmedJob !== '') {
          if (trimmedJob.length > 100) {
            return NextResponse.json(
              { error: 'El cargo no puede exceder los 100 caracteres.' },
              { status: 400 }
            );
          }
          normalizedJob = trimmedJob;
        }
      }
      updateData.jobTitle = normalizedJob;
    }

    // Fetch current user from DB to check for existing internal avatar
    const existingUser = await db.user.findUnique({
      where: { id: currentUser.id },
      select: { avatarUrl: true }
    });

    if (existingUser && avatarUrl !== undefined) {
      const oldKey = getInternalAvatarKey(existingUser.avatarUrl);
      const newKey = getInternalAvatarKey(updateData.avatarUrl);
      
      if (oldKey && oldKey !== newKey) {
        try {
          await deleteFile(currentUser.id, oldKey);
        } catch (deleteErr: unknown) {
          const errorMsg = deleteErr instanceof Error ? deleteErr.message : '';
          // If the file is not found (NoSuchKey / no existe), don't block the profile update
          if (!errorMsg.toLowerCase().includes('no existe') && !errorMsg.toLowerCase().includes('nosuchkey')) {
            console.error('Error deleting orphaned avatar from R2:', deleteErr);
          }
        }
      }
    }

    // 5. Update user in DB
    const updatedUser = await db.user.update({
      where: { id: currentUser.id },
      data: updateData,
    });

    // 6. Return safe user data
    return NextResponse.json(
      {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          avatarUrl: updatedUser.avatarUrl,
          phone: updatedUser.phone,
          company: updatedUser.company,
          department: updatedUser.department,
          jobTitle: updatedUser.jobTitle,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating user profile:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
