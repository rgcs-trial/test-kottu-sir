import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const reportSchema = z.object({
  reason: z.enum([
    'spam',
    'inappropriate_content',
    'fake_review',
    'offensive_language',
    'personal_information',
    'copyright_violation',
    'other'
  ]),
  description: z.string().max(500).optional(),
});

interface RouteParams {
  params: {
    id: string;
  };
}

// POST /api/reviews/[id]/report - Report a review
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();
    const reviewId = params.id;

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = reportSchema.parse(body);

    // Get session ID for anonymous reporting
    const sessionId = request.headers.get('x-session-id');
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Verify review exists and is approved
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, status')
      .eq('id', reviewId)
      .is('deleted_at', null)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check for duplicate reports from the same user/session
    let duplicateQuery = supabase
      .from('review_reports')
      .select('id')
      .eq('review_id', reviewId);

    if (user) {
      duplicateQuery = duplicateQuery.eq('reporter_id', user.id);
    } else if (sessionId) {
      duplicateQuery = duplicateQuery.eq('session_id', sessionId);
    } else {
      duplicateQuery = duplicateQuery.eq('reporter_ip', ipAddress);
    }

    const { data: existingReport } = await duplicateQuery.single();

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already reported this review' },
        { status: 409 }
      );
    }

    // Create report
    const reportData = {
      review_id: reviewId,
      reporter_id: user?.id || null,
      reason: validatedData.reason,
      description: validatedData.description,
      session_id: sessionId || null,
      reporter_ip: ipAddress,
    };

    const { data: report, error: reportError } = await supabase
      .from('review_reports')
      .insert(reportData)
      .select('id')
      .single();

    if (reportError) {
      console.error('Report creation error:', reportError);
      return NextResponse.json(
        { error: 'Failed to create report' },
        { status: 500 }
      );
    }

    // If this is a spam or fake review report, automatically flag the review
    if (['spam', 'fake_review'].includes(validatedData.reason)) {
      await supabase
        .from('reviews')
        .update({ 
          status: 'flagged',
          moderation_notes: `Auto-flagged due to ${validatedData.reason} report`,
        })
        .eq('id', reviewId);
    }

    return NextResponse.json({
      success: true,
      data: { report_id: report.id },
      message: 'Review reported successfully. Our team will review this report.',
    });

  } catch (error) {
    console.error('Report review API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/reviews/[id]/report - Check if user has reported this review
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();
    const reviewId = params.id;

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    const sessionId = request.headers.get('x-session-id');
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    if (!user && !sessionId) {
      return NextResponse.json({
        success: true,
        data: { has_reported: false },
      });
    }

    // Check for existing report
    let reportQuery = supabase
      .from('review_reports')
      .select('id, reason, created_at')
      .eq('review_id', reviewId);

    if (user) {
      reportQuery = reportQuery.eq('reporter_id', user.id);
    } else if (sessionId) {
      reportQuery = reportQuery.eq('session_id', sessionId);
    } else {
      reportQuery = reportQuery.eq('reporter_ip', ipAddress);
    }

    const { data: report } = await reportQuery.single();

    return NextResponse.json({
      success: true,
      data: {
        has_reported: !!report,
        report: report ? {
          reason: report.reason,
          reported_at: report.created_at,
        } : null,
      },
    });

  } catch (error) {
    console.error('Get report status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}