import useContributors from '../../hook/use-contributors';
import AvatarWall from './avatar-wall';

interface ContributorAvatarWallProps {
    appId: string;
}

export default function ContributorAvatarWall(props: ContributorAvatarWallProps) {
    const { appId } = props;

    const { contributors, isLoading, isError } = useContributors(appId);

    return <AvatarWall contributors={contributors} isLoading={isLoading} isError={isError} appId={appId} />;
}
