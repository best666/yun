import { Body, Controller, Delete, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CurrentUser, type CurrentAuthUser } from '@/auth/current-user.decorator';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { ok } from '@/common/api-response';
import { CreateSpotDiscussionDto } from './dto/create-spot-discussion.dto';
import { CreateSpotNoteDto } from './dto/create-spot-note.dto';
import { CreateSpotQuestionAnswerDto } from './dto/create-spot-question-answer.dto';
import { CreateSpotQuestionDto } from './dto/create-spot-question.dto';
import { CreateSpotReviewDto } from './dto/create-spot-review.dto';
import { ToggleSpotDiscussionLikeDto } from './dto/toggle-spot-discussion-like.dto';
import { ToggleSpotFavoriteDto } from './dto/toggle-spot-favorite.dto';
import { ToggleSpotNoteLikeDto } from './dto/toggle-spot-note-like.dto';
import { SpotService } from './spot.service';

@Controller('spot')
export class SpotController {
  constructor(
    private readonly spotService: SpotService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @Get('detail')
  async getSpotDetail(
    @Headers('authorization') authorization?: string,
    @Query('id') id?: string,
    @Query('title') title?: string,
    @Query('address') address?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('distance') distance?: string,
    @Query('category') category?: string,
    @Query('district') district?: string,
    @Query('provider') provider?: string,
  ) {
    const currentUserId = await this.resolveCurrentUserId(authorization);
    const detail = await this.spotService.getSpotDetail({
      id,
      title,
      address,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      distance: distance ? Number(distance) : undefined,
      category,
      district,
      provider,
    }, currentUserId);

    return ok(detail);
  }

  @UseGuards(JwtAuthGuard)
  @Get('favorite/list')
  async getFavoriteList(@CurrentUser() currentUser: CurrentAuthUser) {
    const favorites = await this.spotService.getFavoriteList(currentUser.userId);
    return ok(favorites);
  }

  @UseGuards(JwtAuthGuard)
  @Post('favorite/toggle')
  async toggleFavorite(
    @Body() dto: ToggleSpotFavoriteDto,
    @CurrentUser() currentUser: CurrentAuthUser,
  ) {
    const result = await this.spotService.toggleFavorite(dto.spotId, currentUser.userId);
    return ok(result);
  }

  @UseGuards(JwtAuthGuard)
  @Get('review/my')
  async getMyReviews(@CurrentUser() currentUser: CurrentAuthUser) {
    const reviews = await this.spotService.getMyReviews(currentUser.userId);
    return ok(reviews);
  }

  @UseGuards(JwtAuthGuard)
  @Get('note/my')
  async getMyNotes(@CurrentUser() currentUser: CurrentAuthUser) {
    const notes = await this.spotService.getMyNotes(currentUser.userId);
    return ok(notes);
  }

  @UseGuards(JwtAuthGuard)
  @Get('note/liked/my')
  async getMyLikedNotes(@CurrentUser() currentUser: CurrentAuthUser) {
    const notes = await this.spotService.getMyLikedNotes(currentUser.userId);
    return ok(notes);
  }

  @UseGuards(JwtAuthGuard)
  @Get('question/my')
  async getMyQuestions(@CurrentUser() currentUser: CurrentAuthUser) {
    const questions = await this.spotService.getMyQuestions(currentUser.userId);
    return ok(questions);
  }

  @UseGuards(JwtAuthGuard)
  @Get('interaction-notification/my')
  async getMyInteractionNotifications(@CurrentUser() currentUser: CurrentAuthUser) {
    const notifications = await this.spotService.getMyInteractionNotifications(currentUser.userId);
    return ok(notifications);
  }

  @UseGuards(JwtAuthGuard)
  @Post('review')
  async createReview(
    @Body() dto: CreateSpotReviewDto,
    @CurrentUser() currentUser: CurrentAuthUser,
  ) {
    const review = await this.spotService.createReview(dto, currentUser.userId);
    return ok(review);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('review/:reviewId')
  async deleteReview(
    @Param('reviewId') reviewId: string,
    @CurrentUser() currentUser: CurrentAuthUser,
  ) {
    const result = await this.spotService.deleteReview(Number(reviewId), currentUser.userId);
    return ok(result);
  }

  @UseGuards(JwtAuthGuard)
  @Get('discussion/my')
  async getMyDiscussions(@CurrentUser() currentUser: CurrentAuthUser) {
    const discussions = await this.spotService.getMyDiscussions(currentUser.userId);
    return ok(discussions);
  }

  @UseGuards(JwtAuthGuard)
  @Post('discussion')
  async createDiscussion(
    @Body() dto: CreateSpotDiscussionDto,
    @CurrentUser() currentUser: CurrentAuthUser,
  ) {
    const discussion = await this.spotService.createDiscussion(dto, currentUser.userId);
    return ok(discussion);
  }

  @UseGuards(JwtAuthGuard)
  @Post('note')
  async createNote(
    @Body() dto: CreateSpotNoteDto,
    @CurrentUser() currentUser: CurrentAuthUser,
  ) {
    const note = await this.spotService.createNote(dto, currentUser.userId);
    return ok(note);
  }

  @UseGuards(JwtAuthGuard)
  @Post('question')
  async createQuestion(
    @Body() dto: CreateSpotQuestionDto,
    @CurrentUser() currentUser: CurrentAuthUser,
  ) {
    const question = await this.spotService.createQuestion(dto, currentUser.userId);
    return ok(question);
  }

  @UseGuards(JwtAuthGuard)
  @Post('question/answer')
  async createQuestionAnswer(
    @Body() dto: CreateSpotQuestionAnswerDto,
    @CurrentUser() currentUser: CurrentAuthUser,
  ) {
    const answer = await this.spotService.createQuestionAnswer(dto, currentUser.userId);
    return ok(answer);
  }

  @UseGuards(JwtAuthGuard)
  @Post('discussion/like/toggle')
  async toggleDiscussionLike(
    @Body() dto: ToggleSpotDiscussionLikeDto,
    @CurrentUser() currentUser: CurrentAuthUser,
  ) {
    const result = await this.spotService.toggleDiscussionLike(dto.discussionId, currentUser.userId);
    return ok(result);
  }

  @UseGuards(JwtAuthGuard)
  @Post('note/like/toggle')
  async toggleNoteLike(
    @Body() dto: ToggleSpotNoteLikeDto,
    @CurrentUser() currentUser: CurrentAuthUser,
  ) {
    const result = await this.spotService.toggleNoteLike(dto.noteId, currentUser.userId);
    return ok(result);
  }

  @UseGuards(JwtAuthGuard)
  @Post('interaction-notification/read/all')
  async markAllInteractionNotificationsRead(@CurrentUser() currentUser: CurrentAuthUser) {
    const result = await this.spotService.markAllInteractionNotificationsRead(currentUser.userId);
    return ok(result);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('discussion/:discussionId')
  async deleteDiscussion(
    @Param('discussionId') discussionId: string,
    @CurrentUser() currentUser: CurrentAuthUser,
  ) {
    const result = await this.spotService.deleteDiscussion(Number(discussionId), currentUser.userId);
    return ok(result);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('note/:noteId')
  async deleteNote(
    @Param('noteId') noteId: string,
    @CurrentUser() currentUser: CurrentAuthUser,
  ) {
    const result = await this.spotService.deleteNote(Number(noteId), currentUser.userId);
    return ok(result);
  }

  private async resolveCurrentUserId(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      return undefined;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: number }>(authorization.slice(7), {
        secret: this.configService.get<string>('JWT_SECRET') || 'yun-food-secret',
      });
      return payload.sub;
    }
    catch {
      return undefined;
    }
  }
}
