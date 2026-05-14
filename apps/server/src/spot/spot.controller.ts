import { Body, Controller, Delete, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CurrentUser, type CurrentAuthUser } from '@/auth/current-user.decorator';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { ok } from '@/common/api-response';
import { CreateSpotDiscussionDto } from './dto/create-spot-discussion.dto';
import { CreateSpotReviewDto } from './dto/create-spot-review.dto';
import { CreateSpotReviewReplyDto } from './dto/create-spot-review-reply.dto';
import { ToggleSpotDiscussionLikeDto } from './dto/toggle-spot-discussion-like.dto';
import { ToggleSpotFavoriteDto } from './dto/toggle-spot-favorite.dto';
import { ToggleSpotReviewLikeDto } from './dto/toggle-spot-review-like.dto';
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

  @Get('map/list')
  async getMapViewportSpots(
    @Query('minLatitude') minLatitude: string,
    @Query('maxLatitude') maxLatitude: string,
    @Query('minLongitude') minLongitude: string,
    @Query('maxLongitude') maxLongitude: string,
    @Query('keyword') keyword?: string,
  ) {
    const spots = await this.spotService.getMapViewportSpots({
      minLatitude: Number(minLatitude),
      maxLatitude: Number(maxLatitude),
      minLongitude: Number(minLongitude),
      maxLongitude: Number(maxLongitude),
      keyword,
    });

    return ok(spots);
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
  @Post('review/reply')
  async createReviewReply(
    @Body() dto: CreateSpotReviewReplyDto,
    @CurrentUser() currentUser: CurrentAuthUser,
  ) {
    const reply = await this.spotService.createReviewReply(dto, currentUser.userId);
    return ok(reply);
  }

  @UseGuards(JwtAuthGuard)
  @Get('review/reply/my')
  async getMyReviewReplies(@CurrentUser() currentUser: CurrentAuthUser) {
    const replies = await this.spotService.getMyReviewReplies(currentUser.userId);
    return ok(replies);
  }

  @UseGuards(JwtAuthGuard)
  @Post('review/like/toggle')
  async toggleReviewLike(
    @Body() dto: ToggleSpotReviewLikeDto,
    @CurrentUser() currentUser: CurrentAuthUser,
  ) {
    const result = await this.spotService.toggleReviewLike(dto.reviewId, currentUser.userId);
    return ok(result);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('review/reply/:replyId')
  async deleteReviewReply(
    @Param('replyId') replyId: string,
    @CurrentUser() currentUser: CurrentAuthUser,
  ) {
    const result = await this.spotService.deleteReviewReply(Number(replyId), currentUser.userId);
    return ok(result);
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
  @Post('discussion/like/toggle')
  async toggleDiscussionLike(
    @Body() dto: ToggleSpotDiscussionLikeDto,
    @CurrentUser() currentUser: CurrentAuthUser,
  ) {
    const result = await this.spotService.toggleDiscussionLike(dto.discussionId, currentUser.userId);
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
